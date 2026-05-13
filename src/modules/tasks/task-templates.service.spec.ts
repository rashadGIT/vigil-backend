import { TaskTemplatesService } from './task-templates.service';
import { ServiceType } from '@prisma/client';

describe('TaskTemplatesService', () => {
  const svc = new TaskTemplatesService();

  describe('buildTasksForCase — task counts per service type', () => {
    const cases: Array<[ServiceType, number]> = [
      ['burial', 18],
      ['cremation', 15],
      ['graveside', 12],
      ['memorial', 10],
    ];

    it.each(cases)('%s returns %i tasks', (serviceType, expectedCount) => {
      const tasks = svc.buildTasksForCase('tenant-a', 'case-1', serviceType);
      expect(tasks).toHaveLength(expectedCount);
    });
  });

  describe('tenant and case ID injection', () => {
    it('injects tenantId on every task for all service types', () => {
      for (const type of ['burial', 'cremation', 'graveside', 'memorial'] as ServiceType[]) {
        const tasks = svc.buildTasksForCase('tenant-a', 'case-1', type);
        expect(tasks.every((t) => t.tenantId === 'tenant-a')).toBe(true);
      }
    });

    it('injects caseId on every task', () => {
      const tasks = svc.buildTasksForCase('tenant-a', 'case-xyz', 'burial');
      expect(tasks.every((t) => t.caseId === 'case-xyz')).toBe(true);
    });
  });

  describe('dueDate calculation', () => {
    it('all burial tasks have a Date dueDate (no nulls in template data)', () => {
      const tasks = svc.buildTasksForCase('tenant-a', 'case-1', 'burial');
      tasks.forEach((t) => {
        expect(t.dueDate).toBeInstanceOf(Date);
      });
    });

    it('all cremation tasks have a Date dueDate', () => {
      const tasks = svc.buildTasksForCase('tenant-a', 'case-1', 'cremation');
      tasks.forEach((t) => {
        expect(t.dueDate).toBeInstanceOf(Date);
      });
    });

    it('tasks with defaultDueDays=0 have dueDate equal to baseDate', () => {
      const base = new Date('2025-06-01T00:00:00.000Z');
      const tasks = svc.buildTasksForCase('tenant-a', 'case-1', 'burial', base);
      // First two burial tasks have defaultDueDays: 0
      expect(tasks[0].dueDate!.getTime()).toBe(base.getTime());
      expect(tasks[1].dueDate!.getTime()).toBe(base.getTime());
    });

    it('tasks with defaultDueDays > 0 have dueDate after baseDate', () => {
      const base = new Date('2025-06-01T00:00:00.000Z');
      const tasks = svc.buildTasksForCase('tenant-a', 'case-1', 'burial', base);
      // Third burial task has defaultDueDays: 1
      const oneDayMs = 24 * 60 * 60 * 1000;
      expect(tasks[2].dueDate!.getTime()).toBe(base.getTime() + oneDayMs);
    });
  });

  describe('getTemplate', () => {
    it('returns 18 items for burial', () => {
      expect(svc.getTemplate('burial')).toHaveLength(18);
    });

    it('first burial task title is correct', () => {
      expect(svc.getTemplate('burial')[0].title).toBe(
        'Initial family call — document service preferences',
      );
    });
  });
});
