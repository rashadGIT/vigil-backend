/**
 * @jest-environment node
 */
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CognitoAuthGuard } from './cognito-auth.guard';

// Prevent aws-jwt-verify from being called in tests.
// The verify fn is a stable reference so we can control it per-test via mockResolvedValue.
const mockVerify = jest.fn();
jest.mock('aws-jwt-verify', () => {
  return {
    CognitoJwtVerifier: {
      // create() returns a verifier whose verify fn is the same stable mockVerify
      create: jest.fn().mockImplementation(() => ({ verify: mockVerify })),
    },
  };
});

const mockPrisma = {
  user: {
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    findFirst: jest.fn(),
  },
};

// By default: not @Public(), not @InternalOnly()
const mockReflector = {
  getAllAndOverride: jest.fn().mockReturnValue(false),
};

function makeContext(
  headers: Record<string, string>,
  cookies: Record<string, string> = {},
) {
  const req: {
    headers: Record<string, string>;
    cookies: Record<string, string>;
    user?: unknown;
  } = { headers, cookies };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    _req: req,
  } as unknown as ExecutionContext & { _req: typeof req };
}

describe('CognitoAuthGuard', () => {
  let guard: CognitoAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReflector.getAllAndOverride.mockReturnValue(false);
    process.env.DEV_AUTH_BYPASS = 'true';
    delete process.env.NODE_ENV;
    guard = new CognitoAuthGuard(mockReflector as any, mockPrisma as any);
  });

  afterEach(() => {
    delete process.env.DEV_AUTH_BYPASS;
    delete process.env.NODE_ENV;
  });

  describe('DEV_AUTH_BYPASS path', () => {
    it('returns true when x-dev-user header is present and valid', async () => {
      const ctx = makeContext({
        'x-dev-user': 'sub-1|tenant-a|admin|admin@test.com',
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('super_admin: uses x-tenant-id header as effectiveTenantId when present', async () => {
      const ctx = makeContext({
        'x-dev-user': 'sub-1||super_admin|admin@test.com',
        'x-tenant-id': 'overridden-tenant',
      });
      await guard.canActivate(ctx);
      const req = ctx.switchToHttp().getRequest();
      expect(req.user).toMatchObject({ tenantId: 'overridden-tenant' });
    });

    it('super_admin: effectiveTenantId is empty string when x-tenant-id absent', async () => {
      const ctx = makeContext({
        'x-dev-user': 'sub-1||super_admin|admin@test.com',
      });
      await guard.canActivate(ctx);
      const req = ctx.switchToHttp().getRequest();
      expect(req.user).toMatchObject({ tenantId: '' });
    });

    it('sets req.user from x-dev-user header parts', async () => {
      const ctx = makeContext({
        'x-dev-user': 'sub-1|tenant-a|admin|admin@test.com',
      });
      await guard.canActivate(ctx);
      const req = ctx.switchToHttp().getRequest();
      expect(req.user).toMatchObject({
        sub: 'sub-1',
        tenantId: 'tenant-a',
        role: 'admin',
        email: 'admin@test.com',
      });
    });

    it('uses default fallback when x-dev-user header is absent', async () => {
      // Guard falls back to 'dev-user-1|seed-tenant-id|admin|director@sunrise.demo'
      // so it still returns true (no throw)
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      const req = ctx.switchToHttp().getRequest();
      expect(req.user).toMatchObject({ tenantId: 'seed-tenant-id' });
    });

    it('throws UnauthorizedException for malformed x-dev-user header (missing parts)', async () => {
      // A header with fewer than 4 pipe-separated parts causes falsy sub/tenantId/role/email
      const ctx = makeContext({ 'x-dev-user': 'only-one-part' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('does not call Cognito verifier in bypass mode', async () => {
      const { CognitoJwtVerifier } = jest.requireMock('aws-jwt-verify');
      const ctx = makeContext({
        'x-dev-user': 'sub-1|tenant-a|admin|admin@test.com',
      });
      await guard.canActivate(ctx);
      expect(CognitoJwtVerifier.create).not.toHaveBeenCalled();
    });
  });

  describe('bypass disabled in production', () => {
    it('falls through to JWT path when NODE_ENV=production', async () => {
      process.env.NODE_ENV = 'production';
      const ctx = makeContext({
        'x-dev-user': 'sub-1|tenant-a|admin|admin@test.com',
      });
      // No Bearer token provided — should throw "Missing Bearer token"
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('@Public() routes', () => {
    it('returns true immediately for @Public() routes without reading user header', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // isPublic = true
        .mockReturnValue(false);
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });

  describe('@InternalOnly() routes', () => {
    it('returns true immediately for @InternalOnly() routes (InternalOnlyGuard handles them)', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic = false
        .mockReturnValueOnce(true); // isInternal = true
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });

  describe('production JWT path', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEV_AUTH_BYPASS;
      process.env.COGNITO_USER_POOL_ID = 'us-east-1_testPool';
      process.env.COGNITO_CLIENT_ID = 'test-client-id';
      // Re-create guard so getVerifier() picks up new env vars
      guard = new CognitoAuthGuard(mockReflector as any, mockPrisma as any);
    });

    afterEach(() => {
      delete process.env.COGNITO_USER_POOL_ID;
      delete process.env.COGNITO_CLIENT_ID;
    });

    it('throws "Missing Bearer token or access_token cookie" when no token in header or cookie', async () => {
      const ctx = makeContext({}, {});

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        'Missing Bearer token or access_token cookie',
      );
    });

    it('throws "Auth not configured" when COGNITO_USER_POOL_ID not set', async () => {
      delete process.env.COGNITO_USER_POOL_ID;
      delete process.env.COGNITO_CLIENT_ID;
      // Re-create guard without env vars so verifier returns null
      guard = new CognitoAuthGuard(mockReflector as any, mockPrisma as any);
      const ctx = makeContext({ authorization: 'Bearer some-token' });

      await expect(guard.canActivate(ctx)).rejects.toThrow('Auth not configured');
    });

    it('happy path: sets req.user when token and DB user are valid', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123' });
      mockPrisma.user.findFirst.mockResolvedValue({
        tenantId: 'tenant-a',
        role: 'funeral_director',
        email: 'dir@test.com',
      });

      const ctx = makeContext({ authorization: 'Bearer valid-token' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      const req = ctx.switchToHttp().getRequest();
      expect(req.user).toMatchObject({
        sub: 'sub-123',
        tenantId: 'tenant-a',
        role: 'funeral_director',
        email: 'dir@test.com',
      });
    });

    it('throws UnauthorizedException when prisma.user.findFirst returns null', async () => {
      // The guard's try/catch wraps both verify and the DB lookup, so the inner
      // "User not provisioned" UnauthorizedException is caught and rethrown as "Invalid token".
      mockVerify.mockResolvedValueOnce({ sub: 'sub-unknown' });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const ctx = makeContext({ authorization: 'Bearer valid-token' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('super_admin gets effectiveTenantId from x-tenant-id header when present', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-sa' });
      mockPrisma.user.findFirst.mockResolvedValue({
        tenantId: 'own-tenant',
        role: 'super_admin',
        email: 'sa@vigil.com',
      });

      const ctx = makeContext({
        authorization: 'Bearer valid-token',
        'x-tenant-id': 'override-tenant',
      });
      await guard.canActivate(ctx);

      const req = ctx.switchToHttp().getRequest();
      expect((req.user as any).tenantId).toBe('override-tenant');
    });

    it('super_admin falls back to dbUser.tenantId when x-tenant-id not present', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-sa' });
      mockPrisma.user.findFirst.mockResolvedValue({
        tenantId: 'own-tenant',
        role: 'super_admin',
        email: 'sa@vigil.com',
      });

      const ctx = makeContext({ authorization: 'Bearer valid-token' });
      await guard.canActivate(ctx);

      const req = ctx.switchToHttp().getRequest();
      expect((req.user as any).tenantId).toBe('own-tenant');
    });

    it('accepts token from access_token cookie when no Authorization header', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-cookie' });
      mockPrisma.user.findFirst.mockResolvedValue({
        tenantId: 'tenant-b',
        role: 'staff',
        email: 'staff@test.com',
      });

      const ctx = makeContext({}, { access_token: 'cookie-token' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalledWith('cookie-token');
    });

    it('throws "Invalid token" when verifier.verify throws', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Token signature invalid'));

      const ctx = makeContext({ authorization: 'Bearer bad-token' });

      await expect(guard.canActivate(ctx)).rejects.toThrow('Invalid token');
    });
  });
});
