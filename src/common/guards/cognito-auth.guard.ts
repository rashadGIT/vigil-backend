import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_INTERNAL_KEY } from '../decorators/internal-only.decorator';

interface CognitoAccessTokenClaims {
  sub: string;
  username: string;
  'custom:tenantId': string;
  'custom:role': 'super_admin' | 'funeral_director' | 'staff';
  token_use: 'access';
}

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly logger = new Logger(CognitoAuthGuard.name);
  private verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private getVerifier() {
    if (this.verifier) return this.verifier;
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!userPoolId || !clientId) {
      // In DEV_AUTH_BYPASS mode we never construct the verifier
      return null;
    }
    this.verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    });
    return this.verifier;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip @Public() routes entirely
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Skip @InternalOnly() routes — InternalOnlyGuard handles them
    const isInternal = this.reflector.getAllAndOverride<boolean>(IS_INTERNAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isInternal) return true;

    const request = context.switchToHttp().getRequest();

    // DEV_AUTH_BYPASS — hard-gated on NODE_ENV (D-09)
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.DEV_AUTH_BYPASS === 'true'
    ) {
      this.logger.warn('DEV_AUTH_BYPASS active — Cognito verification skipped');
      const devUser =
        (request.headers['x-dev-user'] as string | undefined) ??
        'dev-user-1|seed-tenant-id|funeral_director|director@sunrise.demo';
      const [sub, tenantId, role, email] = devUser.split('|');
      if (!sub || !role || !email) {
        throw new UnauthorizedException('Malformed x-dev-user header');
      }
      // super_admin may omit tenantId in header; they can override via x-tenant-id on tenant-scoped routes
      const effectiveTenantId =
        role === 'super_admin'
          ? ((request.headers['x-tenant-id'] as string | undefined) ?? '')
          : tenantId;
      request.user = { sub, tenantId: effectiveTenantId, role, email };
      return true;
    }

    // Production: verify Cognito JWT — accept Bearer header OR httpOnly cookie
    const authHeader = request.headers.authorization as string | undefined;
    const token =
      authHeader?.replace('Bearer ', '') ??
      (request.cookies?.['access_token'] as string | undefined);
    if (!token) throw new UnauthorizedException('Missing Bearer token or access_token cookie');

    const verifier = this.getVerifier();
    if (!verifier) {
      this.logger.error('COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID not configured');
      throw new UnauthorizedException('Auth not configured');
    }

    try {
      const payload = (await verifier.verify(token)) as unknown as CognitoAccessTokenClaims;

      // Sync cognitoSub → User (AUTH-04). Safe idempotent update.
      await this.prisma.user.updateMany({
        where: { email: payload.username, cognitoSub: { not: payload.sub } },
        data: { cognitoSub: payload.sub },
      });

      const claimedRole = payload['custom:role'];
      // super_admin has no tenantId claim; they pass x-tenant-id header for tenant-scoped routes
      const effectiveTenantId =
        claimedRole === 'super_admin'
          ? ((request.headers['x-tenant-id'] as string | undefined) ?? '')
          : (payload['custom:tenantId'] ?? '');
      request.user = {
        sub: payload.sub,
        tenantId: effectiveTenantId,
        role: claimedRole,
        email: payload.username,
      };
      return true;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
