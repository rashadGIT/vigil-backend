/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';

jest.mock('@aws-sdk/client-cognito-identity-provider');

const mockSend = jest.fn();

describe('AuthService', () => {
  let service: AuthService;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfig },
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
});
