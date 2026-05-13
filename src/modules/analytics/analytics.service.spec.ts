/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock { return fn as jest.Mock; }

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let scopedSnapshot: { findMany: jest.Mock; create: jest.Mock };
  let scopedPayment: { aggregate: jest.Mock };
  let caseGroupBy: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    scopedSnapshot = { findMany: jest.fn(), create: jest.fn() };
    scopedPayment = { aggregate: jest.fn() };
    caseGroupBy = jest.fn();
    (mockPrisma._scoped as any).analyticsSnapshot = scopedSnapshot;
    (mockPrisma._scoped as any).payment = scopedPayment;
    (mockPrisma._scoped.case as any).groupBy = caseGroupBy;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getSnapshot', () => {
    it('calls forTenant and analyticsSnapshot.findMany', async () => {
      scopedSnapshot.findMany.mockResolvedValue([]);

      await service.getSnapshot('tenant-a');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedSnapshot.findMany).toHaveBeenCalledTimes(1);
    });

    it('filters by period when provided', async () => {
      scopedSnapshot.findMany.mockResolvedValue([]);

      await service.getSnapshot('tenant-a', 'monthly');

      expect(scopedSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ period: 'monthly' }),
        }),
      );
    });

    it('filters by date range when from and to are provided', async () => {
      scopedSnapshot.findMany.mockResolvedValue([]);

      await service.getSnapshot('tenant-a', undefined, '2025-01-01', '2025-12-31');

      expect(scopedSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            periodStart: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('orders by periodStart desc', async () => {
      scopedSnapshot.findMany.mockResolvedValue([]);

      await service.getSnapshot('tenant-a');

      expect(scopedSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { periodStart: 'desc' } }),
      );
    });

    it('returns snapshot list', async () => {
      const snapshots = [{ id: 'snap-1', period: 'monthly' }];
      scopedSnapshot.findMany.mockResolvedValue(snapshots);

      const result = await service.getSnapshot('tenant-a', 'monthly');

      expect(result).toEqual(snapshots);
    });
  });

  describe('computeAndSave', () => {
    beforeEach(() => {
      caseGroupBy.mockResolvedValue([
        { status: 'new', _count: 3 },
        { status: 'completed', _count: 1 },
      ]);
      scopedPayment.aggregate.mockResolvedValue({ _sum: { amountPaid: 10000 } });
      scopedSnapshot.create.mockResolvedValue({ id: 'snap-new' });
    });

    it('calls forTenant with the tenantId', async () => {
      await service.computeAndSave('tenant-a', 'monthly', '2025-01-01');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
    });

    it('aggregates case.groupBy and payment.aggregate in parallel', async () => {
      await service.computeAndSave('tenant-a', 'monthly', '2025-01-01');

      expect(caseGroupBy).toHaveBeenCalledTimes(1);
      expect(scopedPayment.aggregate).toHaveBeenCalledTimes(1);
    });

    it('creates analyticsSnapshot with computed metrics', async () => {
      await service.computeAndSave('tenant-a', 'monthly', '2025-01-01');

      expect(scopedSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            period: 'monthly',
            periodStart: expect.any(Date),
            metrics: expect.objectContaining({
              totalRevenue: 10000,
            }),
          }),
        }),
      );
    });

    it('uses 0 for totalRevenue when payment aggregate returns null', async () => {
      scopedPayment.aggregate.mockResolvedValue({ _sum: { amountPaid: null } });

      await service.computeAndSave('tenant-a', 'monthly', '2025-01-01');

      const callData = scopedSnapshot.create.mock.calls[0][0].data;
      expect(callData.metrics.totalRevenue).toBe(0);
    });

    it('returns the created snapshot', async () => {
      const result = await service.computeAndSave('tenant-a', 'monthly', '2025-01-01');

      expect(result).toHaveProperty('id', 'snap-new');
    });
  });
});
