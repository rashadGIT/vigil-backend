/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../../common/prisma/prisma.service';

jest.mock('@aws-sdk/client-cognito-identity-provider');

const mockCognito = { send: jest.fn() };

describe('SuperAdminService', () => {
  let service: SuperAdminService;

  const mockTenant = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockCase = {
    findMany: jest.fn(),
  };

  const mockUser = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockPrisma = {
    tenant: mockTenant,
    case: mockCase,
    user: mockUser,
  };

  const mockConfig = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    (CognitoIdentityProviderClient as jest.Mock).mockImplementation(
      () => mockCognito,
    );
    // Default: no COGNITO_USER_POOL_ID configured
    mockConfig.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
  });

  // ── listTenants ──────────────────────────────────────────────────────────

  describe('listTenants', () => {
    it('calls tenant.findMany with select and orderBy', async () => {
      const tenants = [{ id: 't1', name: 'Sunrise', slug: 'sunrise' }];
      mockTenant.findMany.mockResolvedValue(tenants);

      const result = await service.listTenants();

      expect(mockTenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ id: true, name: true }),
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual(tenants);
    });
  });

  // ── createTenant ─────────────────────────────────────────────────────────

  describe('createTenant', () => {
    it('throws ConflictException when slug is already taken', async () => {
      mockTenant.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createTenant({ name: 'Dup', slug: 'dup' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException with slug in message', async () => {
      mockTenant.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createTenant({ name: 'Dup', slug: 'dup' } as any),
      ).rejects.toThrow('"dup"');
    });

    it('creates tenant when slug is available', async () => {
      mockTenant.findFirst.mockResolvedValue(null);
      const created = { id: 'new-t', slug: 'sunrise', planTier: 'pilot' };
      mockTenant.create.mockResolvedValue(created);

      const result = await service.createTenant({
        name: 'Sunrise',
        slug: 'sunrise',
      } as any);

      expect(mockTenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'sunrise', active: true }),
        }),
      );
      expect(result).toEqual(created);
    });

    it('defaults planTier to "pilot" when not provided', async () => {
      mockTenant.findFirst.mockResolvedValue(null);
      mockTenant.create.mockResolvedValue({ id: 'x' });

      await service.createTenant({ name: 'Test', slug: 'test' } as any);

      expect(mockTenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planTier: 'pilot' }),
        }),
      );
    });
  });

  // ── updateTenant ─────────────────────────────────────────────────────────

  describe('updateTenant', () => {
    it('throws NotFoundException when tenant not found', async () => {
      mockTenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTenant('missing-id', { active: false } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with tenant id in message', async () => {
      mockTenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTenant('missing-id', {} as any),
      ).rejects.toThrow('missing-id');
    });

    it('calls tenant.update when tenant exists', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1' });
      const updated = { id: 't1', active: false };
      mockTenant.update.mockResolvedValue(updated);

      const result = await service.updateTenant('t1', { active: false } as any);

      expect(mockTenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({ active: false }),
        }),
      );
      expect(result).toEqual(updated);
    });
  });

  // ── getTenantCases ────────────────────────────────────────────────────────

  describe('getTenantCases', () => {
    it('throws NotFoundException when tenant not found', async () => {
      mockTenant.findUnique.mockResolvedValue(null);

      await expect(service.getTenantCases('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns cases for tenant', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1' });
      const cases = [{ id: 'c1', deceasedName: 'John' }];
      mockCase.findMany.mockResolvedValue(cases);

      const result = await service.getTenantCases('t1');

      expect(mockCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', deletedAt: null }),
        }),
      );
      expect(result).toEqual(cases);
    });
  });

  // ── createImpersonationToken ──────────────────────────────────────────────

  describe('createImpersonationToken', () => {
    it('throws NotFoundException when tenant not found', async () => {
      mockTenant.findUnique.mockResolvedValue(null);

      await expect(
        service.createImpersonationToken('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when tenant is inactive', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1', active: false });

      await expect(
        service.createImpersonationToken('t1'),
      ).rejects.toThrow(ConflictException);
    });

    it('returns token and expiresAt on happy path', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1', active: true });

      const result = await service.createImpersonationToken('t1');

      expect(result).toHaveProperty('token');
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.expiresAt).toBe('string');
    });

    it('cleans up expired tokens opportunistically', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1', active: true });

      // Generate a token, then manually expire it by setting exp in the past
      const first = await service.createImpersonationToken('t1');
      // Access private map via bracket notation for test purposes
      const tokenMap = (service as any).impersonationTokens as Map<string, any>;
      tokenMap.get(first.token)!.exp = Date.now() - 1000; // expired

      // Generate second token — should trigger cleanup of first
      await service.createImpersonationToken('t1');

      expect(tokenMap.has(first.token)).toBe(false);
    });
  });

  // ── resolveImpersonationToken ─────────────────────────────────────────────

  describe('resolveImpersonationToken', () => {
    it('returns null for missing token', () => {
      const result = service.resolveImpersonationToken('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null and deletes expired token', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1', active: true });
      const { token } = await service.createImpersonationToken('t1');
      // Expire it
      const tokenMap = (service as any).impersonationTokens as Map<string, any>;
      tokenMap.get(token)!.exp = Date.now() - 1000;

      const result = service.resolveImpersonationToken(token);

      expect(result).toBeNull();
      expect(tokenMap.has(token)).toBe(false);
    });

    it('returns token record when valid and not expired', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1', active: true });
      const { token } = await service.createImpersonationToken('t1');

      const result = service.resolveImpersonationToken(token);

      expect(result).toMatchObject({ tenantId: 't1', role: 'funeral_director' });
    });
  });

  // ── listUsers ─────────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('lists all users without tenantId filter', async () => {
      const users = [{ id: 'u1', email: 'a@test.com' }];
      mockUser.findMany.mockResolvedValue(users);

      const result = await service.listUsers({});

      expect(mockUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
      // no tenantId key in where
      const where = mockUser.findMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('tenantId');
      expect(result).toEqual(users);
    });

    it('filters by tenantId when provided', async () => {
      mockUser.findMany.mockResolvedValue([]);

      await service.listUsers({ tenantId: 'tenant-a' });

      const where = mockUser.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({ deletedAt: null, tenantId: 'tenant-a' });
    });
  });

  // ── createUserInTenant ────────────────────────────────────────────────────

  describe('createUserInTenant', () => {
    const dto = {
      tenantId: 't1',
      email: 'new@test.com',
      name: 'New User',
      role: 'staff',
      temporaryPassword: 'Pass123!',
    } as any;

    it('throws NotFoundException when tenant not found', async () => {
      mockTenant.findUnique.mockResolvedValue(null);

      await expect(service.createUserInTenant(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException on UsernameExistsException from Cognito', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1' });
      const err = new UsernameExistsException({
        message: 'User already exists',
        $metadata: {},
      });
      mockCognito.send.mockRejectedValueOnce(err);

      await expect(service.createUserInTenant(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('re-throws non-UsernameExistsException errors', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1' });
      mockCognito.send.mockRejectedValueOnce(new Error('Network failure'));

      await expect(service.createUserInTenant(dto)).rejects.toThrow(
        'Network failure',
      );
    });

    it('happy path: creates user with cognitoSub from Cognito', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1' });
      mockCognito.send
        .mockResolvedValueOnce({
          User: { Attributes: [{ Name: 'sub', Value: 'cognito-sub-xyz' }] },
        })
        .mockResolvedValueOnce({}); // AdminSetUserPasswordCommand
      const created = { id: 'db-user-1', cognitoSub: 'cognito-sub-xyz' };
      mockUser.create.mockResolvedValue(created);

      const result = await service.createUserInTenant(dto);

      expect(mockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cognitoSub: 'cognito-sub-xyz' }),
        }),
      );
      expect(result).toEqual(created);
    });

    it('falls back to generated cognitoSub when Cognito returns no sub attribute', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1' });
      mockCognito.send
        .mockResolvedValueOnce({ User: { Attributes: [] } }) // no sub
        .mockResolvedValueOnce({});
      mockUser.create.mockResolvedValue({ id: 'db-user-2' });

      await service.createUserInTenant(dto);

      const createdData = mockUser.create.mock.calls[0][0].data;
      expect(createdData.cognitoSub).toMatch(/^cognito-sub-/);
    });

    it('generates stub cognitoSub when no COGNITO_USER_POOL_ID configured (Cognito send resolves empty)', async () => {
      mockTenant.findUnique.mockResolvedValue({ id: 't1' });
      // When userPoolId is undefined, Cognito still gets called but returns no sub
      mockCognito.send
        .mockResolvedValueOnce({ User: { Attributes: [] } })
        .mockResolvedValueOnce({});
      mockUser.create.mockResolvedValue({ id: 'u3' });

      await service.createUserInTenant(dto);

      const createdData = mockUser.create.mock.calls[0][0].data;
      // stub sub built from email
      expect(createdData.cognitoSub).toContain('new-test-com');
    });
  });

  // ── updateUser ────────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('missing-id', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates role in Cognito when COGNITO_USER_POOL_ID is set', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        cognitoSub: 'sub-1',
      });
      mockConfig.get.mockReturnValue('us-east-1_abc');
      mockCognito.send.mockResolvedValue({});
      mockUser.update.mockResolvedValue({ id: 'u1', role: 'admin' });

      await service.updateUser('u1', { role: 'admin' } as any);

      expect(mockCognito.send).toHaveBeenCalled();
    });

    it('skips Cognito call when COGNITO_USER_POOL_ID not set', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        cognitoSub: 'sub-1',
      });
      mockConfig.get.mockReturnValue(undefined);
      mockUser.update.mockResolvedValue({ id: 'u1' });

      await service.updateUser('u1', { role: 'staff' } as any);

      expect(mockCognito.send).not.toHaveBeenCalled();
    });

    it('calls AdminEnableUserCommand when active set to true', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        cognitoSub: 'sub-1',
      });
      mockConfig.get.mockReturnValue('pool-id');
      mockCognito.send.mockResolvedValue({});
      mockUser.update.mockResolvedValue({ id: 'u1', active: true });

      await service.updateUser('u1', { active: true } as any);

      expect(mockCognito.send).toHaveBeenCalled();
    });

    it('calls AdminDisableUserCommand when active set to false', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        cognitoSub: 'sub-1',
      });
      mockConfig.get.mockReturnValue('pool-id');
      mockCognito.send.mockResolvedValue({});
      mockUser.update.mockResolvedValue({ id: 'u1', active: false });

      await service.updateUser('u1', { active: false } as any);

      expect(mockCognito.send).toHaveBeenCalled();
    });

    it('calls user.update with correct data', async () => {
      mockUser.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        cognitoSub: 'sub-1',
      });
      mockConfig.get.mockReturnValue(undefined);
      mockUser.update.mockResolvedValue({ id: 'u1', active: false });

      await service.updateUser('u1', { active: false } as any);

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ active: false }),
        }),
      );
    });
  });

  // ── resetUserPassword ─────────────────────────────────────────────────────

  describe('resetUserPassword', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      await expect(service.resetUserPassword('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('calls Cognito AdminResetUserPasswordCommand when COGNITO_USER_POOL_ID is set', async () => {
      mockUser.findUnique.mockResolvedValue({ email: 'a@test.com' });
      mockConfig.get.mockReturnValue('pool-id');
      mockCognito.send.mockResolvedValue({});

      const result = await service.resetUserPassword('u1');

      expect(mockCognito.send).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('skips Cognito call and returns ok:true when no COGNITO_USER_POOL_ID', async () => {
      mockUser.findUnique.mockResolvedValue({ email: 'a@test.com' });
      mockConfig.get.mockReturnValue(undefined);

      const result = await service.resetUserPassword('u1');

      expect(mockCognito.send).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });
});
