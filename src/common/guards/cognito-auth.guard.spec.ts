/**
 * @jest-environment node
 */
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CognitoAuthGuard } from './cognito-auth.guard';

// Prevent aws-jwt-verify from being called in tests
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn().mockReturnValue({
      verify: jest.fn().mockRejectedValue(new Error('not in test')),
    }),
  },
}));

const mockPrisma = {
  user: {
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
};

// By default: not @Public(), not @InternalOnly()
const mockReflector = {
  getAllAndOverride: jest.fn().mockReturnValue(false),
};

function makeContext(headers: Record<string, string>) {
  const req: { headers: Record<string, string>; user?: unknown } = {
    headers,
  };
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
  });

  describe('DEV_AUTH_BYPASS path', () => {
    it('returns true when x-dev-user header is present and valid', async () => {
      const ctx = makeContext({ 'x-dev-user': 'sub-1|tenant-a|admin|admin@test.com' });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('sets req.user from x-dev-user header parts', async () => {
      const ctx = makeContext({ 'x-dev-user': 'sub-1|tenant-a|admin|admin@test.com' });
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
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('does not call Cognito verifier in bypass mode', async () => {
      const { CognitoJwtVerifier } = jest.requireMock('aws-jwt-verify') as {
        CognitoJwtVerifier: { create: jest.Mock };
      };
      const ctx = makeContext({ 'x-dev-user': 'sub-1|tenant-a|admin|admin@test.com' });
      await guard.canActivate(ctx);
      expect(CognitoJwtVerifier.create).not.toHaveBeenCalled();
    });
  });

  describe('bypass disabled in production', () => {
    it('falls through to JWT path when NODE_ENV=production', async () => {
      process.env.NODE_ENV = 'production';
      const ctx = makeContext({ 'x-dev-user': 'sub-1|tenant-a|admin|admin@test.com' });
      // No Bearer token provided — should throw "Missing Bearer token"
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
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
});
