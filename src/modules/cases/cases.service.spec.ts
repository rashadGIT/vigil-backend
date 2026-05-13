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
function asMock(fn: any): jest.Mock { return fn as jest.Mock; }

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
          data: expect.objectContaining({ tenantId: 'tenant-a', deceasedName: 'John Doe' }),
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
      asMock(mockPrisma._scoped.case.create).mockResolvedValue({ id: 'case-2' });

      await service.create('tenant-a', dto);

      const callData = asMock(mockPrisma._scoped.case.create).mock.calls[0][0].data;
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
          where: expect.objectContaining({ status: CaseStatus.in_progress, deletedAt: null }),
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

      await expect(service.findOne('tenant-a', 'missing-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with case id in message', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(service.findOne('tenant-a', 'missing-id')).rejects.toThrow('missing-id');
    });
  });

  describe('updateStatus', () => {
    it('new → in_progress: allowed, calls case.update with in_progress status', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({ status: CaseStatus.new });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({ id: 'case-1', status: CaseStatus.in_progress });

      const result = await service.updateStatus('tenant-a', 'case-1', CaseStatus.in_progress);

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
          familyContacts: [{ email: 'jane@test.com', phone: '555-0100', isPrimaryContact: true }],
          tenant: { name: 'Sunrise Funeral Home', googleReviewUrl: 'https://g.co/r/sunrise' },
        });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({ id: 'case-1', status: CaseStatus.completed });

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
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({ status: CaseStatus.new });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({ id: 'case-1', status: CaseStatus.archived });

      await expect(service.updateStatus('tenant-a', 'case-1', CaseStatus.archived)).resolves.toBeDefined();
    });

    it('in_progress → archived: allowed', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({ status: CaseStatus.in_progress });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({ id: 'case-1', status: CaseStatus.archived });

      await expect(service.updateStatus('tenant-a', 'case-1', CaseStatus.archived)).resolves.toBeDefined();
    });

    it('completed → archived: allowed', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({ status: CaseStatus.completed });
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({ id: 'case-1', status: CaseStatus.archived });

      await expect(service.updateStatus('tenant-a', 'case-1', CaseStatus.archived)).resolves.toBeDefined();
    });

    it('throws NotFoundException when case not found during transition check', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(service.updateStatus('tenant-a', 'case-1', CaseStatus.in_progress)).rejects.toThrow(
        NotFoundException,
      );
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
        asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({ status: fromStatus });

        await expect(service.updateStatus('tenant-a', 'case-1', toStatus)).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it('throws message containing "Invalid status transition"', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({ status: CaseStatus.archived });

      await expect(service.updateStatus('tenant-a', 'case-1', CaseStatus.new)).rejects.toThrow(
        /Invalid status transition/,
      );
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt on the case record', async () => {
      const caseData = { id: 'case-1', familyContacts: [], tasks: [] };
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(caseData);
      asMock(mockPrisma._scoped.case.update).mockResolvedValue({ ...caseData, deletedAt: new Date() });

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

      await expect(service.softDelete('tenant-a', 'missing-id')).rejects.toThrow(NotFoundException);
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
