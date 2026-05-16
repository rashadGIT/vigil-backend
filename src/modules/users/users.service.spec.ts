/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';

jest.mock('@aws-sdk/client-cognito-identity-provider');

const mockSend = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let scopedUser: { create: jest.Mock; findMany: jest.Mock };

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'AWS_REGION') return 'us-east-2';
      if (key === 'COGNITO_USER_POOL_ID') return 'us-east-2_TestPool';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (CognitoIdentityProviderClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    mockPrisma = createMockPrisma();
    scopedUser = { create: jest.fn(), findMany: jest.fn() };
    (mockPrisma._scoped as any).user = scopedUser;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: EmailService,
          useValue: {
            sendWelcome: jest.fn().mockResolvedValue(undefined),
            send: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    const dto = {
      email: 'staff@example.com',
      name: 'Staff Member',
      role: 'staff' as any,
      temporaryPassword: 'TempPass123!',
    };

    it('sends AdminCreateUserCommand to Cognito', async () => {
      mockSend
        .mockResolvedValueOnce({
          User: { Attributes: [{ Name: 'sub', Value: 'cognito-sub-123' }] },
        })
        .mockResolvedValueOnce({});
      scopedUser.create.mockResolvedValue({ id: 'user-1' });

      await service.create('tenant-a', dto);

      expect(mockSend).toHaveBeenCalledWith(expect.any(AdminCreateUserCommand));
    });

    it('sends AdminSetUserPasswordCommand after creating user', async () => {
      mockSend
        .mockResolvedValueOnce({
          User: { Attributes: [{ Name: 'sub', Value: 'sub-abc' }] },
        })
        .mockResolvedValueOnce({});
      scopedUser.create.mockResolvedValue({ id: 'user-1' });

      await service.create('tenant-a', dto);

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(AdminSetUserPasswordCommand),
      );
    });

    it('calls forTenant and user.create with cognitoSub from Cognito response', async () => {
      mockSend
        .mockResolvedValueOnce({
          User: { Attributes: [{ Name: 'sub', Value: 'sub-xyz' }] },
        })
        .mockResolvedValueOnce({});
      scopedUser.create.mockResolvedValue({
        id: 'user-1',
        cognitoSub: 'sub-xyz',
      });

      await service.create('tenant-a', dto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            email: dto.email,
            name: dto.name,
            role: dto.role,
            cognitoSub: 'sub-xyz',
          }),
        }),
      );
    });

    it('uses empty string for cognitoSub when Cognito attributes are missing', async () => {
      mockSend.mockResolvedValueOnce({ User: {} }).mockResolvedValueOnce({});
      scopedUser.create.mockResolvedValue({ id: 'user-1' });

      await service.create('tenant-a', dto);

      expect(scopedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cognitoSub: '' }),
        }),
      );
    });
  });

  describe('invite', () => {
    const inviteDto = {
      email: 'invite@example.com',
      name: 'New Staff',
      role: 'staff' as any,
    };

    beforeEach(() => {
      asMock(mockPrisma.tenant.findUniqueOrThrow).mockResolvedValue({
        name: 'Sunrise Funeral Home',
      });
      mockSend.mockResolvedValue({
        User: { Attributes: [{ Name: 'sub', Value: 'invite-sub-123' }] },
      });
      scopedUser.create.mockResolvedValue({
        id: 'user-invite-1',
        ...inviteDto,
      });
    });

    it('creates user in Cognito with SUPPRESS MessageAction', async () => {
      await service.invite('tenant-a', inviteDto);

      expect(mockSend).toHaveBeenCalledWith(expect.any(AdminCreateUserCommand));
    });

    it('creates user in Prisma with cognitoSub from Cognito response', async () => {
      await service.invite('tenant-a', inviteDto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            email: inviteDto.email,
            cognitoSub: 'invite-sub-123',
          }),
        }),
      );
    });

    it('throws ConflictException when email already exists in Cognito', async () => {
      mockSend.mockRejectedValue(
        new UsernameExistsException({ message: 'exists', $metadata: {} }),
      );

      await expect(service.invite('tenant-a', inviteDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows non-UsernameExists Cognito errors', async () => {
      mockSend.mockRejectedValue(new Error('Unexpected Cognito error'));

      await expect(service.invite('tenant-a', inviteDto)).rejects.toThrow(
        'Unexpected Cognito error',
      );
    });

    it('returns the created user', async () => {
      const created = { id: 'user-invite-1', email: inviteDto.email };
      scopedUser.create.mockResolvedValue(created);

      const result = await service.invite('tenant-a', inviteDto);

      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('calls forTenant and user.findMany excluding deleted users', async () => {
      scopedUser.findMany.mockResolvedValue([]);

      await service.findAll('tenant-a');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('returns the list of users', async () => {
      const users = [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
      ];
      scopedUser.findMany.mockResolvedValue(users);

      const result = await service.findAll('tenant-a');

      expect(result).toEqual(users);
    });
  });

});
