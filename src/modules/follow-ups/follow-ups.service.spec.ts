/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FollowUpsService } from './follow-ups.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';
import { N8nEvent } from '../n8n/n8n-events.enum';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock { return fn as jest.Mock; }

describe('FollowUpsService', () => {
  let service: FollowUpsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const mockN8n = { trigger: jest.fn().mockResolvedValue(undefined) };
  const mockConfig = { get: jest.fn().mockReturnValue('noreply@kelovaapp.com') };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: N8nService, useValue: mockN8n },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<FollowUpsService>(FollowUpsService);
  });

  describe('scheduleForCase', () => {
    const BASE_DATE = new Date('2025-01-01T00:00:00.000Z');
    const DAY_MS = 24 * 3600 * 1000;

    beforeEach(() => {
      asMock(mockPrisma._scoped.followUp.create).mockResolvedValue({ id: 'fu-1' });
      asMock(mockPrisma._scoped.familyContact.findFirst).mockResolvedValue({
        id: 'contact-1',
        email: 'jane@test.com',
        name: 'Jane Doe',
      });
      asMock(mockPrisma._scoped.tenant.findFirst).mockResolvedValue({
        id: 'tenant-a',
        name: 'Sunrise Funeral Home',
      });
    });

    it('creates exactly 4 followUp records', async () => {
      await service.scheduleForCase('tenant-a', 'case-1', 'contact-1', BASE_DATE);

      expect(mockPrisma._scoped.followUp.create).toHaveBeenCalledTimes(4);
    });

    it('one_week followUp scheduledAt = baseDate + 7 days', async () => {
      await service.scheduleForCase('tenant-a', 'case-1', 'contact-1', BASE_DATE);

      const calls = asMock(mockPrisma._scoped.followUp.create).mock.calls;
      const oneWeekCall = calls.find((c: any[]) => c[0].data.templateType === 'one_week');
      expect(oneWeekCall).toBeDefined();
      expect(oneWeekCall[0].data.scheduledAt).toEqual(new Date(BASE_DATE.getTime() + 7 * DAY_MS));
    });

    it('one_month followUp scheduledAt = baseDate + 30 days', async () => {
      await service.scheduleForCase('tenant-a', 'case-1', 'contact-1', BASE_DATE);

      const calls = asMock(mockPrisma._scoped.followUp.create).mock.calls;
      const oneMonthCall = calls.find((c: any[]) => c[0].data.templateType === 'one_month');
      expect(oneMonthCall[0].data.scheduledAt).toEqual(new Date(BASE_DATE.getTime() + 30 * DAY_MS));
    });

    it('six_month followUp scheduledAt = baseDate + 180 days', async () => {
      await service.scheduleForCase('tenant-a', 'case-1', 'contact-1', BASE_DATE);

      const calls = asMock(mockPrisma._scoped.followUp.create).mock.calls;
      const sixMonthCall = calls.find((c: any[]) => c[0].data.templateType === 'six_month');
      expect(sixMonthCall[0].data.scheduledAt).toEqual(new Date(BASE_DATE.getTime() + 180 * DAY_MS));
    });

    it('one_year followUp scheduledAt = baseDate + 365 days', async () => {
      await service.scheduleForCase('tenant-a', 'case-1', 'contact-1', BASE_DATE);

      const calls = asMock(mockPrisma._scoped.followUp.create).mock.calls;
      const oneYearCall = calls.find((c: any[]) => c[0].data.templateType === 'one_year');
      expect(oneYearCall[0].data.scheduledAt).toEqual(new Date(BASE_DATE.getTime() + 365 * DAY_MS));
    });

    it('triggers N8nEvent.GRIEF_FOLLOWUP_SCHEDULE with enriched payload', async () => {
      await service.scheduleForCase('tenant-a', 'case-1', 'contact-1', BASE_DATE);

      expect(mockN8n.trigger).toHaveBeenCalledWith(
        N8nEvent.GRIEF_FOLLOWUP_SCHEDULE,
        expect.objectContaining({
          tenantId: 'tenant-a',
          caseId: 'case-1',
          familyEmail: 'jane@test.com',
          funeralHomeName: 'Sunrise Funeral Home',
        }),
      );
    });

    it('includes followUpIds array in n8n trigger payload', async () => {
      await service.scheduleForCase('tenant-a', 'case-1', 'contact-1', BASE_DATE);

      expect(mockN8n.trigger).toHaveBeenCalledWith(
        N8nEvent.GRIEF_FOLLOWUP_SCHEDULE,
        expect.objectContaining({
          followUpIds: expect.arrayContaining(['fu-1']),
        }),
      );
    });

    it('returns the array of created followUp records', async () => {
      const result = await service.scheduleForCase('tenant-a', 'case-1', 'contact-1', BASE_DATE);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
    });

    it('uses current date as baseDate when not provided', async () => {
      const before = Date.now();
      await service.scheduleForCase('tenant-a', 'case-1', 'contact-1');
      const after = Date.now();

      const calls = asMock(mockPrisma._scoped.followUp.create).mock.calls;
      const oneWeekCall = calls.find((c: any[]) => c[0].data.templateType === 'one_week');
      const scheduledMs = oneWeekCall[0].data.scheduledAt.getTime();
      expect(scheduledMs).toBeGreaterThanOrEqual(before + 7 * DAY_MS);
      expect(scheduledMs).toBeLessThanOrEqual(after + 7 * DAY_MS);
    });
  });

  describe('findByCase', () => {
    it('calls forTenant and followUp.findMany with caseId filter', async () => {
      asMock(mockPrisma._scoped.followUp.findMany).mockResolvedValue([]);

      await service.findByCase('tenant-a', 'case-1');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(mockPrisma._scoped.followUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { caseId: 'case-1' } }),
      );
    });
  });

  describe('markAllComplete', () => {
    it('calls followUp.updateMany with status sent and sentAt', async () => {
      asMock(mockPrisma._scoped.followUp.updateMany).mockResolvedValue({ count: 4 });

      await service.markAllComplete('tenant-a', 'case-1');

      expect(mockPrisma._scoped.followUp.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { caseId: 'case-1', status: 'pending' },
          data: expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }),
        }),
      );
    });

    it('returns updatedCount from the updateMany result', async () => {
      asMock(mockPrisma._scoped.followUp.updateMany).mockResolvedValue({ count: 4 });

      const result = await service.markAllComplete('tenant-a', 'case-1');

      expect(result).toEqual({ updatedCount: 4 });
    });

    it('returns updatedCount: 0 when nothing was pending', async () => {
      asMock(mockPrisma._scoped.followUp.updateMany).mockResolvedValue({ count: 0 });

      const result = await service.markAllComplete('tenant-a', 'case-1');

      expect(result).toEqual({ updatedCount: 0 });
    });
  });
});
