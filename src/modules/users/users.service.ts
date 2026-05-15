import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class UsersService {
  private readonly cognito: CognitoIdentityProviderClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly email: EmailService,
  ) {
    this.cognito = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('AWS_REGION') ?? 'us-east-2',
    });
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');

    const cognitoResult = await this.cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: dto.email,
        UserAttributes: [
          { Name: 'email', Value: dto.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:tenantId', Value: tenantId },
          { Name: 'custom:role', Value: dto.role },
        ],
        MessageAction: 'SUPPRESS',
      }),
    );

    await this.cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: dto.email,
        Password: dto.temporaryPassword,
        Permanent: true,
      }),
    );

    const cognitoSub =
      cognitoResult.User?.Attributes?.find((a) => a.Name === 'sub')?.Value ??
      '';

    return this.prisma.forTenant(tenantId).user.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        cognitoSub,
      },
    });
  }

  async invite(tenantId: string, dto: InviteUserDto) {
    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');
    const appDomain =
      this.configService.get<string>('APP_DOMAIN') ?? 'kelovaapp.com';

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true },
    });
    const funeralHomeName = tenant.name;

    // Generate a cryptographically secure temp password
    const tempPassword =
      randomBytes(12).toString('base64').slice(0, 16) + '!A1';

    let cognitoSub = '';
    try {
      const cognitoResult = await this.cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: dto.email,
          UserAttributes: [
            { Name: 'email', Value: dto.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: dto.name },
            { Name: 'custom:tenantId', Value: tenantId },
            { Name: 'custom:role', Value: dto.role },
          ],
          // Suppress Cognito's default email — we send our own branded invite
          MessageAction: 'SUPPRESS',
          TemporaryPassword: tempPassword,
        }),
      );
      cognitoSub =
        cognitoResult.User?.Attributes?.find((a) => a.Name === 'sub')?.Value ??
        '';
    } catch (err) {
      if (err instanceof UsernameExistsException) {
        throw new ConflictException(
          `A user with email ${dto.email} already exists`,
        );
      }
      throw err;
    }

    // Mirror user in Prisma
    const user = await this.prisma.forTenant(tenantId).user.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        cognitoSub,
      },
    });

    // Send branded invite email
    const loginUrl = `https://app.${appDomain}/login`;
    await this.email.send({
      to: dto.email,
      subject: `You've been invited to ${funeralHomeName} on Kelova`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2>You've been invited to ${funeralHomeName}</h2>
          <p>Hi ${dto.name},</p>
          <p>${funeralHomeName} has added you to their Kelova account as <strong>${dto.role}</strong>.</p>
          <p>Use these credentials to log in for the first time:</p>
          <ul>
            <li><strong>Email:</strong> ${dto.email}</li>
            <li><strong>Temporary password:</strong> <code>${tempPassword}</code></li>
          </ul>
          <p>You will be asked to set a new password on your first login.</p>
          <a href="${loginUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px;">
            Log in to Kelova
          </a>
          <p style="margin-top:24px;color:#666;font-size:12px;">
            If you were not expecting this invitation, you can ignore this email.
          </p>
        </div>
      `,
    });

    return user;
  }

  findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
