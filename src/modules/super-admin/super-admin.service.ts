import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminResetUserPasswordCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ListUsersFilterDto } from './dto/list-users-filter.dto';

interface ImpersonationToken {
  tenantId: string;
  role: 'funeral_director';
  exp: number;
}

@Injectable()
export class SuperAdminService {
  // In-memory store for short-lived impersonation tokens (support use only)
  private readonly impersonationTokens = new Map<string, ImpersonationToken>();
  private readonly cognito: CognitoIdentityProviderClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.cognito = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('AWS_REGION') ?? 'us-east-2',
    });
  }

  listTenants() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        planTier: true,
        active: true,
        createdAt: true,
        _count: { select: { users: true, cases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTenant(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.slug }, { subdomain: dto.slug }] },
    });
    if (existing)
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        subdomain: dto.slug,
        planTier: dto.planTier ?? 'pilot',
        active: true,
      },
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.planTier !== undefined && { planTier: dto.planTier }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async getTenantCases(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    // Cross-tenant query — intentionally bypasses forTenant(); super_admin only
    return this.prisma.case.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        deceasedName: true,
        status: true,
        stage: true,
        serviceType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createImpersonationToken(
    tenantId: string,
  ): Promise<{ token: string; expiresAt: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    if (!tenant.active)
      throw new ConflictException(`Tenant ${tenantId} is inactive`);

    const token = randomBytes(32).toString('hex');
    const exp = Date.now() + 60 * 60 * 1000; // 1 hour
    this.impersonationTokens.set(token, {
      tenantId,
      role: 'funeral_director',
      exp,
    });

    // Clean up expired tokens opportunistically
    for (const [k, v] of this.impersonationTokens) {
      if (v.exp < Date.now()) this.impersonationTokens.delete(k);
    }

    return { token, expiresAt: new Date(exp).toISOString() };
  }

  resolveImpersonationToken(token: string): ImpersonationToken | null {
    const record = this.impersonationTokens.get(token);
    if (!record) return null;
    if (record.exp < Date.now()) {
      this.impersonationTokens.delete(token);
      return null;
    }
    return record;
  }

  // ── User Management ──────────────────────────────────────────────────────

  listUsers(filter: ListUsersFilterDto) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUserInTenant(dto: CreateAdminUserDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant)
      throw new NotFoundException(`Tenant ${dto.tenantId} not found`);

    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');
    let cognitoSub = '';

    try {
      const result = await this.cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: dto.email,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: dto.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: dto.name },
            { Name: 'custom:tenantId', Value: dto.tenantId },
            { Name: 'custom:role', Value: dto.role },
          ],
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
      cognitoSub =
        result.User?.Attributes?.find((a) => a.Name === 'sub')?.Value ?? '';
    } catch (err) {
      if (err instanceof UsernameExistsException) {
        throw new ConflictException(
          `User ${dto.email} already exists in Cognito`,
        );
      }
      throw err;
    }

    // Stub sub for offline/dev (no Cognito configured)
    if (!cognitoSub) {
      cognitoSub = `cognito-sub-${dto.email.replace('@', '-').replace(/\./g, '-')}`;
    }

    return this.prisma.user.create({
      data: {
        tenantId: dto.tenantId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        cognitoSub,
        active: true,
      },
    });
  }

  async updateUser(id: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, cognitoSub: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');
    const COGNITO_ENABLED = !!userPoolId;

    if (COGNITO_ENABLED && dto.role !== undefined) {
      await this.cognito.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: userPoolId,
          Username: user.email,
          UserAttributes: [{ Name: 'custom:role', Value: dto.role }],
        }),
      );
    }

    if (COGNITO_ENABLED && dto.active !== undefined) {
      const cmd = dto.active
        ? new AdminEnableUserCommand({
            UserPoolId: userPoolId,
            Username: user.email,
          })
        : new AdminDisableUserCommand({
            UserPoolId: userPoolId,
            Username: user.email,
          });
      await this.cognito.send(cmd);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async resetUserPassword(id: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { email: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');
    if (userPoolId) {
      await this.cognito.send(
        new AdminResetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: user.email,
        }),
      );
    }
    return { ok: true };
  }
}
