/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

describe('TasksService', () => {
  let service: TasksService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let taskDelete: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    taskDelete = jest.fn();
    (mockPrisma._scoped.task as any).delete = taskDelete;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('create', () => {
    it('calls forTenant and task.create with correct data', async () => {
      const dto = { title: 'File death certificate' } as any;
      const expected = {
        id: 'task-1',
        tenantId: 'tenant-a',
        caseId: 'case-1',
        title: dto.title,
      };
      asMock(mockPrisma._scoped.task.create).mockResolvedValue(expected);

      const result = await service.create('tenant-a', 'case-1', dto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(mockPrisma._scoped.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            caseId: 'case-1',
            title: dto.title,
          }),
        }),
      );
      expect(result).toEqual(expected);
    });

    it('converts dueDate string to Date object', async () => {
      const dto = { title: 'Task with due date', dueDate: '2025-06-01' } as any;
      asMock(mockPrisma._scoped.task.create).mockResolvedValue({
        id: 'task-1',
      });

      await service.create('tenant-a', 'case-1', dto);

      const callData = asMock(mockPrisma._scoped.task.create).mock.calls[0][0]
        .data;
      expect(callData.dueDate).toBeInstanceOf(Date);
    });

    it('sets dueDate to null when not provided', async () => {
      const dto = { title: 'Task without due date' } as any;
      asMock(mockPrisma._scoped.task.create).mockResolvedValue({
        id: 'task-1',
      });

      await service.create('tenant-a', 'case-1', dto);

      const callData = asMock(mockPrisma._scoped.task.create).mock.calls[0][0]
        .data;
      expect(callData.dueDate).toBeNull();
    });
  });

  describe('findByCase', () => {
    it('calls forTenant and task.findMany with caseId filter', async () => {
      asMock(mockPrisma._scoped.task.findMany).mockResolvedValue([]);

      await service.findByCase('tenant-a', 'case-1');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(mockPrisma._scoped.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { caseId: 'case-1' } }),
      );
    });

    it('orders by completed asc then dueDate asc', async () => {
      asMock(mockPrisma._scoped.task.findMany).mockResolvedValue([]);

      await service.findByCase('tenant-a', 'case-1');

      expect(mockPrisma._scoped.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
        }),
      );
    });
  });

  describe('update', () => {
    it('updates task when it exists', async () => {
      const existing = { id: 'task-1' };
      const dto = { completed: true } as any;
      asMock(mockPrisma._scoped.task.findFirst).mockResolvedValue(existing);
      asMock(mockPrisma._scoped.task.update).mockResolvedValue({
        ...existing,
        completed: true,
        completedBy: 'user-1',
      });

      const result = await service.update('tenant-a', 'task-1', dto, 'user-1');

      expect(mockPrisma._scoped.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: expect.objectContaining({ completedBy: 'user-1' }),
        }),
      );
      expect(result).toHaveProperty('completed', true);
    });

    it('does not set completedBy when completed is false', async () => {
      const existing = { id: 'task-1' };
      const dto = { completed: false } as any;
      asMock(mockPrisma._scoped.task.findFirst).mockResolvedValue(existing);
      asMock(mockPrisma._scoped.task.update).mockResolvedValue({
        ...existing,
        completed: false,
      });

      await service.update('tenant-a', 'task-1', dto, 'user-1');

      const callData = asMock(mockPrisma._scoped.task.update).mock.calls[0][0]
        .data;
      expect(callData.completedBy).toBeUndefined();
    });

    it('throws NotFoundException when task does not exist', async () => {
      asMock(mockPrisma._scoped.task.findFirst).mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'missing', {}, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with task id in message', async () => {
      asMock(mockPrisma._scoped.task.findFirst).mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'task-99', {}, 'user-1'),
      ).rejects.toThrow('task-99');
    });
  });

  describe('remove', () => {
    it('deletes task when it exists', async () => {
      const existing = { id: 'task-1' };
      asMock(mockPrisma._scoped.task.findFirst).mockResolvedValue(existing);
      taskDelete.mockResolvedValue(existing);

      await service.remove('tenant-a', 'task-1');

      expect(taskDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'task-1' } }),
      );
    });

    it('throws NotFoundException when task does not exist', async () => {
      asMock(mockPrisma._scoped.task.findFirst).mockResolvedValue(null);

      await expect(service.remove('tenant-a', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
