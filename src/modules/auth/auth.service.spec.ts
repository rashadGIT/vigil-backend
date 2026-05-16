/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';

jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(),
  },
}));

const mockSend = jest.fn();

// Helper to build a fake idToken with a base64url-encoded JSON payload
function makeIdToken(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;

  // Declare mockPrisma at outer scope so syncGoogleUser tests can access it
  let mockPrisma: {
    tenant: { findUnique: jest.Mock };
    user: { upsert: jest.Mock };
  };

  const mockConfig = { get: jest.fn().mockReturnValue('us-east-2') };
  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    (CognitoIdentityProviderClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    mockPrisma = {
      tenant: { findUnique: jest.fn() },
      user: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('returns accessToken and sets refresh cookie on success', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'access-token-123',
          RefreshToken: 'refresh-token-456',
        },
      });

      const result = await service.login(
        'user@example.com',
        'password',
        mockResponse,
      );

      expect(result).toEqual({ accessToken: 'access-token-123' });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token-456',
        expect.objectContaining({ httpOnly: true, path: '/auth' }),
      );
    });

    it('sends InitiateAuthCommand with USER_PASSWORD_AUTH flow', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: { AccessToken: 'tok', RefreshToken: 'ref' },
      });

      await service.login('user@example.com', 'pass', mockResponse);

      expect(mockSend).toHaveBeenCalledWith(expect.any(InitiateAuthCommand));
    });

    it('throws UnauthorizedException when Cognito returns no AccessToken', async () => {
      mockSend.mockResolvedValueOnce({ AuthenticationResult: {} });

      await expect(
        service.login('user@example.com', 'pass', mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when Cognito send throws (NotAuthorizedException)', async () => {
      const err = new Error('Incorrect username or password.');
      err.name = 'NotAuthorizedException';
      mockSend.mockRejectedValueOnce(err);

      await expect(
        service.login('user@example.com', 'bad-pass', mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException with "Invalid credentials" message on failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('some error'));

      await expect(
        service.login('user@example.com', 'pass', mockResponse),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('returns new accessToken on valid refresh token', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: { AccessToken: 'new-access-token' },
      });

      const result = await service.refresh('valid-refresh-token');

      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('sends InitiateAuthCommand with REFRESH_TOKEN_AUTH flow', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: { AccessToken: 'new-token' },
      });

      await service.refresh('refresh-token');

      expect(mockSend).toHaveBeenCalledWith(expect.any(InitiateAuthCommand));
    });

    it('throws UnauthorizedException when Cognito returns no AccessToken on refresh', async () => {
      mockSend.mockResolvedValueOnce({ AuthenticationResult: {} });

      await expect(service.refresh('stale-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when Cognito throws on refresh', async () => {
      mockSend.mockRejectedValueOnce(new Error('Token expired'));

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('calls GlobalSignOutCommand with the access token', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.logout('access-token-abc', mockResponse);

      expect(mockSend).toHaveBeenCalledWith(expect.any(GlobalSignOutCommand));
    });

    it('clears refresh_token cookie', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.logout('access-token-abc', mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/auth',
      });
    });

    it('returns { ok: true }', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await service.logout('access-token-abc', mockResponse);

      expect(result).toEqual({ ok: true });
    });

    it('swallows Cognito errors on logout and still clears cookie', async () => {
      mockSend.mockRejectedValueOnce(new Error('Token already revoked'));

      await expect(service.logout('bad-token', mockResponse)).resolves.toEqual({
        ok: true,
      });
      expect(mockResponse.clearCookie).toHaveBeenCalled();
    });
  });

  describe('syncGoogleUser', () => {
    // Get the mocked CognitoJwtVerifier
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CognitoJwtVerifier } = require('aws-jwt-verify');

    const mockVerify = jest.fn();

    beforeEach(() => {
      // Default: config provides both required env vars
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_testPool';
        if (key === 'COGNITO_CLIENT_ID') return 'test-client-id';
        return 'us-east-2';
      });
      CognitoJwtVerifier.create.mockReturnValue({ verify: mockVerify });
    });

    it('throws UnauthorizedException "Auth not configured" when COGNITO_USER_POOL_ID is missing', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'COGNITO_USER_POOL_ID') return undefined;
        if (key === 'COGNITO_CLIENT_ID') return 'test-client-id';
        return 'us-east-2';
      });

      await expect(
        service.syncGoogleUser('access-tok', makeIdToken({})),
      ).rejects.toThrow('Auth not configured');
    });

    it('throws UnauthorizedException "Auth not configured" when COGNITO_CLIENT_ID is missing', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_testPool';
        if (key === 'COGNITO_CLIENT_ID') return undefined;
        return 'us-east-2';
      });

      await expect(
        service.syncGoogleUser('access-tok', makeIdToken({})),
      ).rejects.toThrow('Auth not configured');
    });

    it('throws UnauthorizedException when verifier.verify rejects', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Token expired'));

      await expect(
        service.syncGoogleUser('bad-token', makeIdToken({ email: 'a@b.com' })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws "User has no tenant assigned" when custom:tenantId missing from idToken', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123' });
      const idToken = makeIdToken({ email: 'a@b.com', sub: 'sub-123' });

      await expect(
        service.syncGoogleUser('valid-access', idToken),
      ).rejects.toThrow('User has no tenant assigned');
    });

    it('throws UnauthorizedException when tenant not found in DB', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123' });
      const idToken = makeIdToken({
        sub: 'sub-123',
        email: 'a@b.com',
        'custom:tenantId': 'missing-tenant',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.syncGoogleUser('valid-access', idToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('happy path: returns UserProfile with correct fields', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-abc' });
      const idToken = makeIdToken({
        sub: 'sub-abc',
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
        'custom:tenantId': 'tenant-1',
        'custom:role': 'funeral_director',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'John Doe',
        role: 'funeral_director',
        tenantId: 'tenant-1',
      });

      const result = await service.syncGoogleUser('valid-access', idToken);

      expect(result).toMatchObject({
        id: 'user-1',
        email: 'test@example.com',
        name: 'John Doe',
        role: 'funeral_director',
        tenantId: 'tenant-1',
      });
    });

    it('role defaults to "staff" when custom:role is an invalid value', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-xyz' });
      const idToken = makeIdToken({
        sub: 'sub-xyz',
        email: 'test@example.com',
        'custom:tenantId': 'tenant-1',
        'custom:role': 'invalid_role',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        name: 'test@example.com',
        role: 'staff',
        tenantId: 'tenant-1',
      });

      await service.syncGoogleUser('valid-access', idToken);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ role: 'staff' }),
        }),
      );
    });

    it('name falls back to email when given_name and family_name are missing', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-nnn' });
      const idToken = makeIdToken({
        sub: 'sub-nnn',
        email: 'noname@example.com',
        'custom:tenantId': 'tenant-1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'u2',
        email: 'noname@example.com',
        name: 'noname@example.com',
        role: 'staff',
        tenantId: 'tenant-1',
      });

      await service.syncGoogleUser('valid-access', idToken);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ name: 'noname@example.com' }),
        }),
      );
    });

    it('calls prisma.user.upsert with cognitoSub as where key', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-upsert' });
      const idToken = makeIdToken({
        sub: 'sub-upsert',
        email: 'u@x.com',
        given_name: 'A',
        family_name: 'B',
        'custom:tenantId': 'tenant-1',
        'custom:role': 'staff',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'u3',
        email: 'u@x.com',
        name: 'A B',
        role: 'staff',
        tenantId: 'tenant-1',
      });

      await service.syncGoogleUser('valid-access', idToken);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cognitoSub: 'sub-upsert' },
        }),
      );
    });
  });
});
