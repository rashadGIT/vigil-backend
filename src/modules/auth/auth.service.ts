import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

interface IdTokenPayload {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  'custom:tenantId'?: string;
  'custom:role'?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly client: CognitoIdentityProviderClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.client = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('AWS_REGION') ?? 'us-east-2',
    });
  }

  async login(
    email: string,
    password: string,
    response: Response,
  ): Promise<{ accessToken: string }> {
    try {
      const result = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.configService.get<string>('COGNITO_CLIENT_ID'),
          AuthParameters: { USERNAME: email, PASSWORD: password },
        }),
      );
      const auth = result.AuthenticationResult;
      if (!auth?.AccessToken || !auth.RefreshToken) {
        throw new UnauthorizedException('Login failed');
      }
      this.setRefreshCookie(response, auth.RefreshToken);
      this.setAccessCookie(response, auth.AccessToken);
      return { accessToken: auth.AccessToken };
    } catch (err) {
      this.logger.warn(`Login failed for ${email}: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const result = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: this.configService.get<string>('COGNITO_CLIENT_ID'),
          AuthParameters: { REFRESH_TOKEN: refreshToken },
        }),
      );
      const accessToken = result.AuthenticationResult?.AccessToken;
      if (!accessToken) throw new UnauthorizedException('Refresh failed');
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
  }

  async syncGoogleUser(accessToken: string, idToken: string): Promise<UserProfile> {
    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');
    const clientId = this.configService.get<string>('COGNITO_CLIENT_ID');
    if (!userPoolId || !clientId) {
      throw new UnauthorizedException('Auth not configured');
    }

    const verifier = CognitoJwtVerifier.create({ userPoolId, tokenUse: 'access', clientId });
    let sub: string;
    try {
      const payload = await verifier.verify(accessToken);
      sub = payload.sub;
    } catch (err) {
      this.logger.warn(`syncGoogleUser: invalid access token — ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid access token');
    }

    // Parse (but don't re-verify) the ID token for custom attributes
    const [, rawPayload] = idToken.split('.');
    const idPayload = JSON.parse(
      Buffer.from(rawPayload, 'base64url').toString('utf8'),
    ) as IdTokenPayload;

    const tenantId = idPayload['custom:tenantId'];
    const rawRole = idPayload['custom:role'] ?? 'staff';
    const VALID_ROLES: UserRole[] = ['super_admin', 'funeral_director', 'staff'];
    const role: UserRole = VALID_ROLES.includes(rawRole as UserRole) ? (rawRole as UserRole) : 'staff';
    const email = idPayload.email;
    const name =
      [idPayload.given_name, idPayload.family_name].filter(Boolean).join(' ') || email;

    if (!tenantId) {
      this.logger.warn(`syncGoogleUser: no custom:tenantId for sub ${sub}`);
      throw new UnauthorizedException('User has no tenant assigned');
    }

    const tenantExists = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenantExists) {
      this.logger.warn(`syncGoogleUser: tenantId ${tenantId} not found in DB for sub ${sub}`);
      throw new UnauthorizedException(`Tenant '${tenantId}' not found — update your Cognito custom:tenantId attribute`);
    }

    this.logger.log(`syncGoogleUser: upserting user sub=${sub} email=${email} tenantId=${tenantId} role=${role}`);
    const user = await this.prisma.user.upsert({
      where: { cognitoSub: sub },
      create: { cognitoSub: sub, tenantId, email, name, role },
      update: { email, name, role },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    });
    return { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId };
  }

  async logout(accessToken: string, response: Response): Promise<{ ok: true }> {
    try {
      await this.client.send(
        new GlobalSignOutCommand({ AccessToken: accessToken }),
      );
    } catch (err) {
      this.logger.warn(`Logout swallowed error: ${(err as Error).message}`);
    }
    response.clearCookie('refresh_token', { path: '/auth' });
    response.clearCookie('access_token', { path: '/' });
    return { ok: true };
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain:
        process.env.NODE_ENV === 'production' ? '.kelovaapp.com' : 'localhost',
      path: '/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private setAccessCookie(response: Response, accessToken: string): void {
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain:
        process.env.NODE_ENV === 'production' ? '.kelovaapp.com' : 'localhost',
      path: '/',
      // Cognito access tokens live 1 hour; cookie matches
      maxAge: 60 * 60 * 1000,
    });
  }
}
