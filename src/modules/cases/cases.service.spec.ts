/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CaseStatus } from '@prisma/client';
import { CasesService } from './cases.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';
import { N8nEvent } from '../n8n/n8n-events.enum';

// Cast helpers to avoid Prisma return-type inference issues on jest mocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

describe('CasesService', () => {
  let service: CasesService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const mockN8n = { trigger: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: N8nService, useValue: mockN8n },
      ],
    }).compile();
    service = module.get<CasesService>(CasesService);
  });

  describe('create', () => {
    it('calls forTenant and case.create with correct data', async () => {
      const dto = { deceasedName: 'John Doe', serviceType: 'burial' as any };
      const expected = { id: 'case-1', tenantId: 'tenant-a' };
      asMock(mockPrisma._scoped.case.create).mockResolvedValue(expected);

      const result = await service.create('tenant-a', dto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(mockPrisma._scoped.case.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            deceasedName: 'John Doe',
          }),
        }),
      );
      expect(result).toEqual(expected);
    });

    it('sets deceasedDob and deceasedDod as Date objects when provided', async () => {
      const dto = {
        deceasedName: 'Jane Doe',
        serviceType: 'cremation' as any,
        deceasedDob: '1940-05-10',
        deceasedDod: '2025-01-01',
      };
      asMock(mockPrisma._scoped.case.create).mockResolvedValue({
        id: 'case-2',
      });

      await service.create('tenant-a', dto);

      const callData = asMock(mockPrisma._scoped.case.create).mock.calls[0][0]
        .data;
      expect(callData.deceasedDob).toBeInstanceOf(Date);
      expect(callData.deceasedDod).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('returns cases with overdueTaskCount derived from tasks array', async () => {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([
        { id: 'case-1', status: 'new', tasks: [{ id: 't1' }, { id: 't2' }] },
        { id: 'case-2', status: 'in_progress', tasks: [] },
      ]);

      const results = await service.findAll('tenant-a', {});

      expect(results[0].overdueTaskCount).toBe(2);
      expect(results[1].overdueTaskCount).toBe(0);
      expect(results[0].tasks).toBeUndefined();
    });

    it('passes status filter to findMany where clause', async () => {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { status: CaseStatus.in_progress });

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CaseStatus.in_progress,
            deletedAt: null,
          }),
        }),
      );
    });

    it('excludes deleted cases (deletedAt: null in where clause)', async () => {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', {});

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    it('passes assignedToId filter to findMany where clause', async () => {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { assignedToId: 'user-1' });

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedToId: 'user-1' }),
        }),
      );
    });

    it('dashboardFilter overdue: queries tasks and injects id filter', async () => {
      asMock(mockPrisma._scoped.task.findMany).mockResolvedValue([
        { caseId: 'c1' },
        { caseId: 'c2' },
      ]);
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { dashboardFilter: 'overdue' });

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['c1', 'c2'] } }),
        }),
      );
    });

    it('dashboardFilter pending-signatures: queries signatures and injects id filter', async () => {
      asMock(mockPrisma._scoped.signature.findMany).mockResolvedValue([
        { caseId: 's1' },
      ]);
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { dashboardFilter: 'pending-signatures' });

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['s1'] } }),
        }),
      );
    });

    it('dashboardFilter this-month: injects createdAt gte filter', async () => {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { dashboardFilter: 'this-month' });

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('dashboardFilter active: injects status in-progress/new filter', async () => {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { dashboardFilter: 'active' });

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['new', 'in_progress'] },
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      asMock(mockPrisma._scoped.case.count).mockResolvedValue(0);
      asMock(mockPrisma._scoped.signature.count).mockResolvedValue(0);
    });

    it('returns activeCases from db count', async () => {
      asMock(mockPrisma._scoped.case.count)
        .mockResolvedValueOnce(5) // activeCases
        .mockResolvedValueOnce(3) // activeCasesYesterday
        .mockResolvedValueOnce(8) // casesThisMonth
        .mockResolvedValueOnce(6) // casesLastMonth
        .mockResolvedValueOnce(2); // overdueTasks
      asMock(mockPrisma._scoped.signature.count).mockResolvedValue(1);

      const result = await service.getStats('tenant-a');

      expect(result.activeCases).toBe(5);
    });

    it('computes activeCasesDelta as difference from yesterday', async () => {
      asMock(mockPrisma._scoped.case.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      asMock(mockPrisma._scoped.signature.count).mockResolvedValue(0);

      const result = await service.getStats('tenant-a');

      expect(result.activeCasesDelta).toBe(3);
    });

    it('returns pendingSignatures from signature.count', async () => {
      asMock(mockPrisma._scoped.case.count).mockResolvedValue(0);
      asMock(mockPrisma._scoped.signature.count).mockResolvedValue(4);

      const result = await service.getStats('tenant-a');

      expect(result.pendingSignatures).toBe(4);
    });

    it('calls forTenant with the correct tenantId', async () => {
      asMock(mockPrisma._scoped.case.count).mockResolvedValue(0);
      asMock(mockPrisma._scoped.signature.count).mockResolvedValue(0);

      await service.getStats('tenant-b');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-b');
    });
  });

  describe('findOne', () => {
    it('returns case when found', async () => {
      const found = { id: 'case-1', familyContacts: [], tasks: [] };
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(found);

      const result = await service.findOne('tenant-a', 'case-1');

      expect(result).toEqual(found);
    });

    it('throws NotFoundException when case.findFirst returns null', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(service.findOne('tenant-a', 'missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException with case id in message', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(service.findOne('tenant-a', 'missing-id')).rejects.toThrow(
        'missing-id',
      );
    });
  });

  describe('update', () => {
    it('updates case fields without status', async () => {
      const existing = { id: 'case-1', status: 'new', familyContacts: [], tasks: [] };
      const updated = { id: 'case-1', deceasedName: 'Jane Doe' };
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(existing);
      asMock(mockPrisma._scoped.case.update).mockResolvedValue(updated);

      const result = await service.update('tenant-a', 'case-1', { deceasedName: 'Jane Doe' } as any);

      expect(result).toEqual(updated);
      expect(mockPrisma._scoped.case.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'case-1' } }),
      );
    });

    it('throws NotFoundException when case does not exist', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'missing', { deceasedName: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('new → in_progress: allowed, calls case.update with in_progress status', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({
        status: CaseStatus.new,
      });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({
        id: 'case-1',
        status: CaseStatus.in_progress,
      });

      const result = await service.updateStatus(
        'tenant-a',
        'case-1',
        CaseStatus.in_progress,
      );

      expect(mockPrisma._scoped.case.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: CaseStatus.in_progress } }),
      );
      expect(result.status).toBe(CaseStatus.in_progress);
    });

    it('in_progress → completed: fires REVIEW_REQUEST and DOC_GENERATE n8n events', async () => {
      asMock(mockPrisma._scoped.case.findFirst)
        // First call: assertValidTransition check
        .mockResolvedValueOnce({ status: CaseStatus.in_progress })
        // Second call: enriched case for n8n payload
        .mockResolvedValueOnce({
          id: 'case-1',
          familyContacts: [
            {
              email: 'jane@test.com',
              phone: '555-0100',
              isPrimaryContact: true,
            },
          ],
          tenant: {
            name: 'Sunrise Funeral Home',
            googleReviewUrl: 'https://g.co/r/sunrise',
          },
        });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({
        id: 'case-1',
        status: CaseStatus.completed,
      });

      await service.updateStatus('tenant-a', 'case-1', CaseStatus.completed);

      expect(mockN8n.trigger).toHaveBeenCalledWith(
        N8nEvent.REVIEW_REQUEST,
        expect.objectContaining({ tenantId: 'tenant-a', caseId: 'case-1' }),
      );
      expect(mockN8n.trigger).toHaveBeenCalledWith(
        N8nEvent.DOC_GENERATE,
        expect.objectContaining({ caseId: 'case-1', tenantId: 'tenant-a' }),
      );
      expect(mockN8n.trigger).toHaveBeenCalledTimes(2);
    });

    it('new → archived: allowed', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({
        status: CaseStatus.new,
      });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({
        id: 'case-1',
        status: CaseStatus.archived,
      });

      await expect(
        service.updateStatus('tenant-a', 'case-1', CaseStatus.archived),
      ).resolves.toBeDefined();
    });

    it('in_progress → archived: allowed', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({
        status: CaseStatus.in_progress,
      });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({
        id: 'case-1',
        status: CaseStatus.archived,
      });

      await expect(
        service.updateStatus('tenant-a', 'case-1', CaseStatus.archived),
      ).resolves.toBeDefined();
    });

    it('completed → archived: allowed', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({
        status: CaseStatus.completed,
      });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({
        id: 'case-1',
        status: CaseStatus.archived,
      });

      await expect(
        service.updateStatus('tenant-a', 'case-1', CaseStatus.archived),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException when case not found during transition check', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(
        service.updateStatus('tenant-a', 'case-1', CaseStatus.in_progress),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('ALLOWED_TRANSITIONS — invalid paths throw BadRequestException', () => {
    const invalidTransitions: Array<[CaseStatus, CaseStatus]> = [
      [CaseStatus.archived, CaseStatus.new],
      [CaseStatus.archived, CaseStatus.in_progress],
      [CaseStatus.archived, CaseStatus.completed],
      [CaseStatus.completed, CaseStatus.new],
      [CaseStatus.completed, CaseStatus.in_progress],
    ];

    it.each(invalidTransitions)(
      '%s → %s throws BadRequestException',
      async (fromStatus, toStatus) => {
        asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({
          status: fromStatus,
        });

        await expect(
          service.updateStatus('tenant-a', 'case-1', toStatus),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('throws message containing "Invalid status transition"', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({
        status: CaseStatus.archived,
      });

      await expect(
        service.updateStatus('tenant-a', 'case-1', CaseStatus.new),
      ).rejects.toThrow(/Invalid status transition/);
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt on the case record', async () => {
      const caseData = { id: 'case-1', familyContacts: [], tasks: [] };
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(caseData);
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({
        ...caseData,
        deletedAt: new Date(),
      });

      await service.softDelete('tenant-a', 'case-1');

      expect(mockPrisma._scoped.case.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'case-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('throws NotFoundException if case does not exist', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(
        service.softDelete('tenant-a', 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hardDeleteExpiredCases', () => {
    it('calls bare prisma.case.deleteMany (bypasses forTenant)', async () => {
      asMock(mockPrisma.case.deleteMany).mockResolvedValue({ count: 3 });

      const result = await service.hardDeleteExpiredCases();

      expect(result).toEqual({ deletedCount: 3 });
      expect(mockPrisma.case.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('does NOT call forTenant (cross-tenant operation)', async () => {
      asMock(mockPrisma.case.deleteMany).mockResolvedValue({ count: 0 });

      await service.hardDeleteExpiredCases();

      expect(mockPrisma.forTenant).not.toHaveBeenCalled();
    });

    it('returns deletedCount: 0 when nothing expired', async () => {
      asMock(mockPrisma.case.deleteMany).mockResolvedValue({ count: 0 });

      const result = await service.hardDeleteExpiredCases();

      expect(result).toEqual({ deletedCount: 0 });
    });
  });

  describe('findAll with dashboardFilter', () => {
    it('overdue: queries task.findMany and filters cases by returned caseIds', async () => {
      asMock(mockPrisma._scoped.task.findMany).mockResolvedValue([
        { caseId: 'case-1' },
        { caseId: 'case-2' },
      ]);
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { dashboardFilter: 'overdue' } as any);

      expect(mockPrisma._scoped.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ completed: false }),
          select: { caseId: true },
        }),
      );
      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['case-1', 'case-2'] },
          }),
        }),
      );
    });

    it('pending-signatures: queries signature.findMany and filters cases by caseIds', async () => {
      asMock(mockPrisma._scoped.signature.findMany).mockResolvedValue([
        { caseId: 'case-3' },
      ]);
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', {
        dashboardFilter: 'pending-signatures',
      } as any);

      expect(mockPrisma._scoped.signature.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { signedAt: null },
          select: { caseId: true },
        }),
      );
      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['case-3'] },
          }),
        }),
      );
    });

    it('this-month: passes createdAt gte startOfMonth in where clause', async () => {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { dashboardFilter: 'this-month' } as any);

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('active: passes status: { in: ["new", "in_progress"] } in where clause', async () => {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue([]);

      await service.findAll('tenant-a', { dashboardFilter: 'active' } as any);

      expect(mockPrisma._scoped.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['new', 'in_progress'] },
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('happy path: calls findOne then case.update', async () => {
      const existing = { id: 'case-1', familyContacts: [], tasks: [] };
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(existing);
      const updated = { id: 'case-1', deceasedName: 'Updated Name' };
      asMock(mockPrisma._scoped.case.update).mockResolvedValue(updated);

      const result = await service.update('tenant-a', 'case-1', {
        deceasedName: 'Updated Name',
      } as any);

      expect(mockPrisma._scoped.case.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'case-1' },
          data: expect.objectContaining({ deceasedName: 'Updated Name' }),
        }),
      );
      expect(result).toEqual(updated);
    });

    it('with status: calls assertValidTransition before update', async () => {
      // First findFirst for findOne, second for assertValidTransition
      asMock(mockPrisma._scoped.case.findFirst)
        .mockResolvedValueOnce({ id: 'case-1', familyContacts: [], tasks: [] })
        .mockResolvedValueOnce({ status: CaseStatus.new });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({
        id: 'case-1',
        status: CaseStatus.in_progress,
      });

      await service.update('tenant-a', 'case-1', {
        status: CaseStatus.in_progress,
      } as any);

      expect(mockPrisma._scoped.case.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CaseStatus.in_progress }),
        }),
      );
    });

    it('throws NotFoundException when case does not exist', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'missing', { deceasedName: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRevenueReport', () => {
    const from = '2026-01-01';
    const to = '2026-03-31';

    function setupRevenueMocks({
      cases = [] as any[],
      amountPaidSum = 0,
      totalAmountSum = 0,
      amountPaidSum2 = 0,
      groupBy = [] as any[],
    } = {}) {
      asMock(mockPrisma._scoped.case.findMany).mockResolvedValue(cases);
      asMock(mockPrisma._scoped.payment.aggregate)
        .mockResolvedValueOnce({ _sum: { amountPaid: amountPaidSum } })
        .mockResolvedValueOnce({
          _sum: { totalAmount: totalAmountSum, amountPaid: amountPaidSum2 },
        });
      asMock(mockPrisma._scoped.case.groupBy).mockResolvedValue(groupBy);
    }

    it('returns correct shape with totalCases, totalRevenue, averageCaseValue, pendingBalance', async () => {
      setupRevenueMocks({
        cases: [
          {
            id: 'c1',
            serviceType: 'burial',
            createdAt: new Date('2026-01-15'),
            payment: { amountPaid: 3000, totalAmount: 5000 },
          },
        ],
        amountPaidSum: 3000,
        totalAmountSum: 5000,
        amountPaidSum2: 3000,
        groupBy: [{ serviceType: 'burial', _count: { id: 1 } }],
      });

      const result = await service.getRevenueReport('tenant-a', from, to);

      expect(result.totalCases).toBe(1);
      expect(result.totalRevenue).toBe(3000);
      expect(result.averageCaseValue).toBe(3000);
      expect(result.pendingBalance).toBe(2000); // 5000 - 3000
    });

    it('returns averageCaseValue of 0 when totalCases is 0', async () => {
      setupRevenueMocks({ amountPaidSum: 0 });

      const result = await service.getRevenueReport('tenant-a', from, to);

      expect(result.totalCases).toBe(0);
      expect(result.averageCaseValue).toBe(0);
    });

    it('returns revenueByServiceType with count and revenue', async () => {
      setupRevenueMocks({
        cases: [
          {
            id: 'c1',
            serviceType: 'cremation',
            createdAt: new Date('2026-02-10'),
            payment: { amountPaid: 2000, totalAmount: 2000 },
          },
          {
            id: 'c2',
            serviceType: 'cremation',
            createdAt: new Date('2026-02-20'),
            payment: { amountPaid: 1500, totalAmount: 1500 },
          },
        ],
        amountPaidSum: 3500,
        totalAmountSum: 3500,
        amountPaidSum2: 3500,
        groupBy: [{ serviceType: 'cremation', _count: { id: 2 } }],
      });

      const result = await service.getRevenueReport('tenant-a', from, to);

      expect(result.revenueByServiceType).toEqual([
        { serviceType: 'cremation', count: 2, revenue: 3500 },
      ]);
    });

    it('month-bucketing: two cases in same month merge into one entry', async () => {
      setupRevenueMocks({
        cases: [
          {
            id: 'c1',
            serviceType: 'burial',
            createdAt: new Date('2026-01-05'),
            payment: { amountPaid: 1000, totalAmount: 1000 },
          },
          {
            id: 'c2',
            serviceType: 'cremation',
            createdAt: new Date('2026-01-20'),
            payment: { amountPaid: 500, totalAmount: 500 },
          },
        ],
        amountPaidSum: 1500,
        groupBy: [
          { serviceType: 'burial', _count: { id: 1 } },
          { serviceType: 'cremation', _count: { id: 1 } },
        ],
      });

      const result = await service.getRevenueReport('tenant-a', from, to);

      expect(result.casesByMonth).toHaveLength(1);
      expect(result.casesByMonth[0]).toMatchObject({
        month: '2026-01',
        count: 2,
        revenue: 1500,
      });
    });

    it('month-bucketing: cases in different months produce separate entries sorted asc', async () => {
      setupRevenueMocks({
        cases: [
          {
            id: 'c1',
            serviceType: 'burial',
            createdAt: new Date('2026-03-01'),
            payment: { amountPaid: 800, totalAmount: 800 },
          },
          {
            id: 'c2',
            serviceType: 'cremation',
            createdAt: new Date('2026-01-15'),
            payment: { amountPaid: 600, totalAmount: 600 },
          },
        ],
        amountPaidSum: 1400,
        groupBy: [],
      });

      const result = await service.getRevenueReport('tenant-a', from, to);

      expect(result.casesByMonth).toHaveLength(2);
      expect(result.casesByMonth[0].month).toBe('2026-01');
      expect(result.casesByMonth[1].month).toBe('2026-03');
    });

    it('handles null payment gracefully (amountPaid defaults to 0)', async () => {
      setupRevenueMocks({
        cases: [
          {
            id: 'c1',
            serviceType: 'burial',
            createdAt: new Date('2026-02-01'),
            payment: null,
          },
        ],
        amountPaidSum: 0,
        groupBy: [{ serviceType: 'burial', _count: { id: 1 } }],
      });

      const result = await service.getRevenueReport('tenant-a', from, to);

      expect(result.revenueByServiceType[0].revenue).toBe(0);
      expect(result.casesByMonth[0].revenue).toBe(0);
    });

    it('calls forTenant with the correct tenantId', async () => {
      setupRevenueMocks();

      await service.getRevenueReport('tenant-b', from, to);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-b');
    });
  });

  describe('getOverdueTaskSummary', () => {
    it('groups overdue tasks by tenantId and returns overdueCount', async () => {
      asMock(mockPrisma.task.findMany).mockResolvedValue([
        { case: { id: 'c1', tenantId: 'tenant-a' } },
        { case: { id: 'c2', tenantId: 'tenant-a' } },
        { case: { id: 'c3', tenantId: 'tenant-b' } },
      ]);

      const result = await service.getOverdueTaskSummary();

      const tenantA = result.find((r) => r.tenantId === 'tenant-a');
      const tenantB = result.find((r) => r.tenantId === 'tenant-b');
      expect(tenantA?.overdueCount).toBe(2);
      expect(tenantB?.overdueCount).toBe(1);
    });

    it('deduplicates caseIds within the same tenant', async () => {
      asMock(mockPrisma.task.findMany).mockResolvedValue([
        { case: { id: 'c1', tenantId: 'tenant-a' } },
        { case: { id: 'c1', tenantId: 'tenant-a' } },
      ]);

      const result = await service.getOverdueTaskSummary();

      expect(result[0].caseIds).toEqual(['c1']);
      expect(result[0].overdueCount).toBe(1);
    });

    it('returns empty array when no overdue tasks', async () => {
      asMock(mockPrisma.task.findMany).mockResolvedValue([]);

      const result = await service.getOverdueTaskSummary();

      expect(result).toEqual([]);
    });

    it('does NOT call forTenant (cross-tenant operation)', async () => {
      asMock(mockPrisma.task.findMany).mockResolvedValue([]);

      await service.getOverdueTaskSummary();

      expect(mockPrisma.forTenant).not.toHaveBeenCalled();
    });
  });
});
