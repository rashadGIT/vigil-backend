/**
 * @jest-environment node
 *
 * Tenant isolation integration tests — verifies that service methods always scope
 * queries to the calling tenant and never leak data across tenant boundaries.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { CasesService } from '../modules/cases/cases.service';
import { ContactsService } from '../modules/contacts/contacts.service';
import { TasksService } from '../modules/tasks/tasks.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { N8nService } from '../modules/n8n/n8n.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

function makeScopedMock() {
  return {
    case: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    task: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    familyContact: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    followUp: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    calendarEvent: { create: jest.fn(), findMany: jest.fn() },
    tenant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    document: { create: jest.fn(), findMany: jest.fn() },
    user: { create: jest.fn(), findMany: jest.fn() },
    payment: { aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    caseLineItem: { findMany: jest.fn() },
    analyticsSnapshot: { findMany: jest.fn(), create: jest.fn() },
  };
}

function createIsolationPrisma() {
  const scopeA = makeScopedMock();
  const scopeB = makeScopedMock();

  // Simulates the real PrismaService.forTenant() row-level tenant scoping
  const forTenant = jest.fn().mockImplementation((id: string) => {
    if (id === 'tenant-a') return scopeA;
    if (id === 'tenant-b') return scopeB;
    throw new Error(`Unexpected tenantId: ${id}`);
  });

  // $transaction invokes callback with tenant-a scope by default (overridden per-test when needed)
  const $transaction = jest
    .fn()
    .mockImplementation(async (cb: (tx: typeof scopeA) => unknown) =>
      cb(scopeA),
    );

  return {
    forTenant,
    $transaction,
    tenant: { findUnique: jest.fn() },
    case: { deleteMany: jest.fn(), findMany: jest.fn() },
    task: { findMany: jest.fn() },
    _scopeA: scopeA,
    _scopeB: scopeB,
  };
}

describe('Tenant isolation', () => {
  let casesService: CasesService;
  let contactsService: ContactsService;
  let tasksService: TasksService;
  let prisma: ReturnType<typeof createIsolationPrisma>;
  const n8nMock = { trigger: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = createIsolationPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        ContactsService,
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: N8nService, useValue: n8nMock },
      ],
    }).compile();

    casesService = module.get(CasesService);
    contactsService = module.get(ContactsService);
    tasksService = module.get(TasksService);
  });

  describe('CasesService', () => {
    it('findAll for tenant-a never touches tenant-b scope', async () => {
      asMock(prisma._scopeA.case.findMany).mockResolvedValue([
        { id: 'case-a1', tenantId: 'tenant-a' },
      ]);

      await casesService.findAll('tenant-a', {});

      expect(prisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(prisma._scopeA.case.findMany).toHaveBeenCalledTimes(1);
      expect(prisma._scopeB.case.findMany).not.toHaveBeenCalled();
    });

    it('findAll for tenant-b never touches tenant-a scope', async () => {
      asMock(prisma._scopeB.case.findMany).mockResolvedValue([
        { id: 'case-b1', tenantId: 'tenant-b' },
      ]);

      await casesService.findAll('tenant-b', {});

      expect(prisma.forTenant).toHaveBeenCalledWith('tenant-b');
      expect(prisma._scopeB.case.findMany).toHaveBeenCalledTimes(1);
      expect(prisma._scopeA.case.findMany).not.toHaveBeenCalled();
    });

    it('create stamps the correct tenantId', async () => {
      const dto = { deceasedName: 'Alice Smith', serviceType: 'burial' as any };
      asMock(prisma._scopeA.case.create).mockResolvedValue({
        id: 'case-a2',
        tenantId: 'tenant-a',
      });
      asMock(prisma._scopeA.task.createMany).mockResolvedValue({ count: 0 });

      await casesService.create('tenant-a', dto);

      expect(prisma._scopeA.case.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant-a' }),
        }),
      );
      expect(prisma._scopeB.case.create).not.toHaveBeenCalled();
    });

    it('concurrent findAll calls use independent scopes without bleed', async () => {
      asMock(prisma._scopeA.case.findMany).mockResolvedValue([
        { id: 'case-a', tenantId: 'tenant-a' },
      ]);
      asMock(prisma._scopeB.case.findMany).mockResolvedValue([
        { id: 'case-b', tenantId: 'tenant-b' },
      ]);

      const [resultA, resultB] = await Promise.all([
        casesService.findAll('tenant-a', {}),
        casesService.findAll('tenant-b', {}),
      ]);

      expect(resultA[0].tenantId).toBe('tenant-a');
      expect(resultB[0].tenantId).toBe('tenant-b');
      expect(prisma._scopeA.case.findMany).toHaveBeenCalledTimes(1);
      expect(prisma._scopeB.case.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('ContactsService', () => {
    it('findByCase for tenant-a does not access tenant-b scope', async () => {
      asMock(prisma._scopeA.familyContact.findMany).mockResolvedValue([
        { id: 'contact-a1', tenantId: 'tenant-a' },
      ]);

      await contactsService.findByCase('tenant-a', 'case-a1');

      expect(prisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(prisma._scopeA.familyContact.findMany).toHaveBeenCalledTimes(1);
      expect(prisma._scopeB.familyContact.findMany).not.toHaveBeenCalled();
    });

    it('create for tenant-b stamps correct tenantId and does not touch tenant-a', async () => {
      const dto = {
        firstName: 'Bob',
        lastName: 'Jones',
        relationship: 'son',
        isPrimaryContact: false,
      } as any;
      asMock(prisma._scopeB.familyContact.create).mockResolvedValue({
        id: 'contact-b1',
        tenantId: 'tenant-b',
      });

      await contactsService.create('tenant-b', 'case-b1', dto);

      expect(prisma._scopeB.familyContact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-b',
            caseId: 'case-b1',
          }),
        }),
      );
      expect(prisma._scopeA.familyContact.create).not.toHaveBeenCalled();
    });
  });

  describe('TasksService', () => {
    it('findByCase scopes query to the correct tenant', async () => {
      asMock(prisma._scopeA.task.findMany).mockResolvedValue([
        { id: 'task-a1', tenantId: 'tenant-a' },
      ]);

      await tasksService.findByCase('tenant-a', 'case-a1');

      expect(prisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(prisma._scopeA.task.findMany).toHaveBeenCalledTimes(1);
      expect(prisma._scopeB.task.findMany).not.toHaveBeenCalled();
    });

    it('update for tenant-b does not touch tenant-a task scope', async () => {
      asMock(prisma._scopeB.task.findFirst).mockResolvedValue({
        id: 'task-b1',
        tenantId: 'tenant-b',
        caseId: 'case-b1',
        completed: false,
      });
      asMock(prisma._scopeB.task.update).mockResolvedValue({
        id: 'task-b1',
        completed: true,
      });

      await tasksService.update(
        'tenant-b',
        'task-b1',
        { completed: true },
        'user-b1',
      );

      expect(prisma._scopeB.task.update).toHaveBeenCalledTimes(1);
      expect(prisma._scopeA.task.update).not.toHaveBeenCalled();
    });
  });

  describe('Cross-tenant data leakage', () => {
    it('tenant-a case IDs never appear in tenant-b results', async () => {
      const caseA = {
        id: 'case-a-secret',
        tenantId: 'tenant-a',
        deceasedName: 'Private Person',
      };
      const caseB = {
        id: 'case-b-public',
        tenantId: 'tenant-b',
        deceasedName: 'Another Person',
      };

      asMock(prisma._scopeA.case.findMany).mockResolvedValue([caseA]);
      asMock(prisma._scopeB.case.findMany).mockResolvedValue([caseB]);

      const [resultA, resultB] = await Promise.all([
        casesService.findAll('tenant-a', {}),
        casesService.findAll('tenant-b', {}),
      ]);

      expect(resultB.map((c) => c.id)).not.toContain('case-a-secret');
      expect(resultA.map((c) => c.id)).not.toContain('case-b-public');
    });

    it('forTenant is never called without a tenantId argument', async () => {
      asMock(prisma._scopeA.case.findMany).mockResolvedValue([]);
      await casesService.findAll('tenant-a', {});

      const calls = asMock(prisma.forTenant).mock.calls;
      for (const [id] of calls) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    });
  });
});
