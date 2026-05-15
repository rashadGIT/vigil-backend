/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { TaskTemplatesService } from '../tasks/task-templates.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';
import { N8nEvent } from '../n8n/n8n-events.enum';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

const mockN8n = { trigger: jest.fn().mockResolvedValue(undefined) };
const mockTaskTemplates = {
  buildTasksForCase: jest.fn().mockReturnValue([
    { tenantId: 'tenant-a', caseId: 'case-1', title: 'Task 1', dueDate: null },
    { tenantId: 'tenant-a', caseId: 'case-1', title: 'Task 2', dueDate: null },
    { tenantId: 'tenant-a', caseId: 'case-1', title: 'Task 3', dueDate: null },
  ]),
};

const validDto = {
  deceasedName: 'John Doe',
  serviceType: 'burial' as any,
  primaryContact: { name: 'Jane Doe', relationship: 'spouse' },
  financialResponsibilityAcknowledgment: true,
};

describe('IntakeService', () => {
  let service: IntakeService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntakeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: N8nService, useValue: mockN8n },
        { provide: TaskTemplatesService, useValue: mockTaskTemplates },
      ],
    }).compile();
    service = module.get<IntakeService>(IntakeService);
  });

  describe('submit — tenant resolution', () => {
    it('throws NotFoundException when tenant is not found', async () => {
      asMock(mockPrisma.tenant.findUnique).mockResolvedValue(null);

      await expect(service.submit('unknown-slug', validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when tenant is inactive', async () => {
      asMock(mockPrisma.tenant.findUnique).mockResolvedValue({
        id: 'tenant-a',
        active: false,
      });

      await expect(service.submit('inactive-slug', validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws with message containing the slug', async () => {
      asMock(mockPrisma.tenant.findUnique).mockResolvedValue(null);

      await expect(service.submit('bad-slug', validDto)).rejects.toThrow(
        'bad-slug',
      );
    });
  });

  describe('submit — atomic transaction', () => {
    beforeEach(() => {
      asMock(mockPrisma.tenant.findUnique).mockResolvedValue({
        id: 'tenant-a',
        active: true,
      });
      asMock(mockPrisma._tx.case.create).mockResolvedValue({ id: 'case-1' });
      asMock(mockPrisma._tx.familyContact.create).mockResolvedValue({});
      asMock(mockPrisma._tx.task.createMany).mockResolvedValue({ count: 3 });
      asMock(mockPrisma._tx.calendarEvent.create).mockResolvedValue({});
    });

    it('calls $transaction once', async () => {
      await service.submit('sunrise', validDto);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('creates Case inside transaction', async () => {
      await service.submit('sunrise', validDto);

      expect(mockPrisma._tx.case.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            deceasedName: 'John Doe',
          }),
        }),
      );
    });

    it('creates FamilyContact inside transaction', async () => {
      await service.submit('sunrise', validDto);

      expect(mockPrisma._tx.familyContact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            caseId: 'case-1',
            name: 'Jane Doe',
            isPrimaryContact: true,
          }),
        }),
      );
    });

    it('creates Tasks via createMany inside transaction', async () => {
      await service.submit('sunrise', validDto);

      expect(mockPrisma._tx.task.createMany).toHaveBeenCalledTimes(1);
    });

    it('creates CalendarEvent inside transaction', async () => {
      await service.submit('sunrise', validDto);

      expect(mockPrisma._tx.calendarEvent.create).toHaveBeenCalledTimes(1);
    });

    it('returns caseId matching what case.create resolved with', async () => {
      const result = await service.submit('sunrise', validDto);

      expect(result).toMatchObject({ caseId: 'case-1' });
    });
  });

  describe('submit — n8n INTAKE_NOTIFY', () => {
    beforeEach(() => {
      asMock(mockPrisma.tenant.findUnique).mockResolvedValue({
        id: 'tenant-a',
        active: true,
      });
      asMock(mockPrisma._tx.case.create).mockResolvedValue({ id: 'case-1' });
      asMock(mockPrisma._tx.familyContact.create).mockResolvedValue({});
      asMock(mockPrisma._tx.task.createMany).mockResolvedValue({ count: 3 });
      asMock(mockPrisma._tx.calendarEvent.create).mockResolvedValue({});
    });

    it('fires INTAKE_NOTIFY after transaction resolves', async () => {
      await service.submit('sunrise', validDto);
      // flush microtask queue for the fire-and-forget void trigger
      await new Promise((r) => setTimeout(r, 0));

      expect(mockN8n.trigger).toHaveBeenCalledWith(
        N8nEvent.INTAKE_NOTIFY,
        expect.objectContaining({ tenantId: 'tenant-a', caseId: 'case-1' }),
      );
    });

    it('does NOT call n8n.trigger when transaction throws', async () => {
      asMock(mockPrisma.$transaction).mockRejectedValue(new Error('DB error'));

      await expect(service.submit('sunrise', validDto)).rejects.toThrow(
        'DB error',
      );
      await new Promise((r) => setTimeout(r, 0));

      expect(mockN8n.trigger).not.toHaveBeenCalled();
    });
  });
});
