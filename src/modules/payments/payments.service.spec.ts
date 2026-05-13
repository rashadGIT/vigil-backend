/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock { return fn as jest.Mock; }

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let scopedPayment: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    // Extend scoped client with payment model
    scopedPayment = {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    (mockPrisma._scoped as any).payment = scopedPayment;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('upsert', () => {
    const dto = { totalAmount: 5000, amountPaid: 1000, paymentMethod: 'cash' } as any;

    it('creates payment when none exists for case', async () => {
      scopedPayment.findFirst.mockResolvedValue(null);
      scopedPayment.create.mockResolvedValue({ id: 'pay-1', caseId: 'case-1', ...dto });

      const result = await service.upsert('tenant-a', 'case-1', dto);

      expect(scopedPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant-a', caseId: 'case-1' }),
        }),
      );
      expect(result).toHaveProperty('id', 'pay-1');
    });

    it('updates payment when one already exists for case', async () => {
      const existing = { id: 'pay-existing', caseId: 'case-1' };
      scopedPayment.findFirst.mockResolvedValue(existing);
      scopedPayment.update.mockResolvedValue({ ...existing, ...dto });

      const result = await service.upsert('tenant-a', 'case-1', dto);

      expect(scopedPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pay-existing' }, data: dto }),
      );
      expect(scopedPayment.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'pay-existing');
    });

    it('calls forTenant with the tenantId', async () => {
      scopedPayment.findFirst.mockResolvedValue(null);
      scopedPayment.create.mockResolvedValue({ id: 'pay-1' });

      await service.upsert('tenant-a', 'case-1', dto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
    });
  });

  describe('findByCase', () => {
    it('returns payment with outstanding amount calculated', async () => {
      scopedPayment.findFirst.mockResolvedValue({
        id: 'pay-1',
        totalAmount: '5000',
        amountPaid: '1000',
      });

      const result = await service.findByCase('tenant-a', 'case-1');

      expect(result.outstanding).toBe(4000);
    });

    it('throws NotFoundException when no payment exists for case', async () => {
      scopedPayment.findFirst.mockResolvedValue(null);

      await expect(service.findByCase('tenant-a', 'case-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException containing the caseId', async () => {
      scopedPayment.findFirst.mockResolvedValue(null);

      await expect(service.findByCase('tenant-a', 'case-99')).rejects.toThrow('case-99');
    });

    it('calls forTenant with the tenantId', async () => {
      scopedPayment.findFirst.mockResolvedValue({
        id: 'pay-1',
        totalAmount: '2000',
        amountPaid: '2000',
      });

      await service.findByCase('tenant-a', 'case-1');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
    });
  });
});
