import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly client: CognitoIdentityProviderClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('AWS_REGION') ?? 'us-east-2',
    });
  }

  async login(email: string, password: string, response: Response): Promise<{ accessToken: string }> {
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

  async logout(accessToken: string, response: Response): Promise<{ ok: true }> {
    try {
      await this.client.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
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
      domain: process.env.NODE_ENV === 'production' ? '.kelovaapp.com' : 'localhost',
      path: '/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private setAccessCookie(response: Response, accessToken: string): void {
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.kelovaapp.com' : 'localhost',
      path: '/',
      // Cognito access tokens live 1 hour; cookie matches
      maxAge: 60 * 60 * 1000,
    });
  }
}
