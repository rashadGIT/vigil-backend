/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

describe('ReferralsService', () => {
  let service: ReferralsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let scopedReferralSource: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    scopedReferralSource = {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    };
    (mockPrisma._scoped as any).referralSource = scopedReferralSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  describe('create', () => {
    it('calls forTenant and referralSource.create with correct data', async () => {
      const dto = { source: 'google', notes: 'Found online' } as any;
      const expected = {
        id: 'ref-1',
        caseId: 'case-1',
        tenantId: 'tenant-a',
        ...dto,
      };
      scopedReferralSource.create.mockResolvedValue(expected);

      const result = await service.create('tenant-a', 'case-1', dto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedReferralSource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            caseId: 'case-1',
            source: 'google',
          }),
        }),
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findByCase', () => {
    it('calls forTenant and referralSource.findMany with caseId filter', async () => {
      scopedReferralSource.findMany.mockResolvedValue([]);

      await service.findByCase('tenant-a', 'case-1');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedReferralSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { caseId: 'case-1' } }),
      );
    });

    it('orders by createdAt desc', async () => {
      scopedReferralSource.findMany.mockResolvedValue([]);

      await service.findByCase('tenant-a', 'case-1');

      expect(scopedReferralSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('returns the list of referral sources', async () => {
      const referrals = [
        { id: 'ref-1', source: 'google' },
        { id: 'ref-2', source: 'word_of_mouth' },
      ];
      scopedReferralSource.findMany.mockResolvedValue(referrals);

      const result = await service.findByCase('tenant-a', 'case-1');

      expect(result).toEqual(referrals);
    });
  });

  describe('remove', () => {
    it('deletes referral when it exists', async () => {
      const existing = { id: 'ref-1' };
      scopedReferralSource.findFirst.mockResolvedValue(existing);
      scopedReferralSource.delete.mockResolvedValue(existing);

      await service.remove('tenant-a', 'ref-1');

      expect(scopedReferralSource.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ref-1' } }),
      );
    });

    it('throws NotFoundException when referral does not exist', async () => {
      scopedReferralSource.findFirst.mockResolvedValue(null);

      await expect(service.remove('tenant-a', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException with referral id in message', async () => {
      scopedReferralSource.findFirst.mockResolvedValue(null);

      await expect(service.remove('tenant-a', 'ref-99')).rejects.toThrow(
        'ref-99',
      );
    });
  });
});
