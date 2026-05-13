/**
 * @jest-environment node
 */
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InternalOnlyGuard } from './internal-only.guard';

const INTERNAL_API_KEY = 'secret-key-123';

const mockConfig = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'INTERNAL_API_KEY') return INTERNAL_API_KEY;
    return undefined;
  }),
};

// Default reflector: route IS @InternalOnly()
const mockReflector = {
  getAllAndOverride: jest.fn().mockReturnValue(true),
};

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('InternalOnlyGuard', () => {
  let guard: InternalOnlyGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReflector.getAllAndOverride.mockReturnValue(true); // @InternalOnly() route
    guard = new InternalOnlyGuard(mockConfig as any, mockReflector as any);
  });

  it('returns true when x-vigil-internal-key matches INTERNAL_API_KEY', () => {
    const ctx = makeContext({ 'x-vigil-internal-key': INTERNAL_API_KEY });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when x-vigil-internal-key header is missing', () => {
    const ctx = makeContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when x-vigil-internal-key has wrong value', () => {
    const ctx = makeContext({ 'x-vigil-internal-key': 'wrong-key' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('returns true (pass-through) when route is NOT @InternalOnly()', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false); // not @InternalOnly()
    const ctx = makeContext({}); // no key header
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws when INTERNAL_API_KEY env var is not configured', () => {
    mockConfig.get.mockReturnValue(undefined); // no key configured
    const ctx = makeContext({ 'x-vigil-internal-key': 'anything' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
