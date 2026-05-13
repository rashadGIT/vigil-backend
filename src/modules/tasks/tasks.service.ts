import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, caseId: string, dto: CreateTaskDto) {
    return this.prisma.forTenant(tenantId).task.create({
      data: {
        tenantId,
        caseId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  findByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).task.findMany({
      where: { caseId },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
    });
  }

  findOverdue(tenantId: string) {
    return this.prisma.forTenant(tenantId).task.findMany({
      where: { completed: false, dueDate: { lt: new Date() } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateTaskDto, userId: string) {
    const existing = await this.prisma.forTenant(tenantId).task.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);
    return this.prisma.forTenant(tenantId).task.update({
      where: { id },
      data: {
        ...dto,
        completedBy: dto.completed === true ? userId : dto.completedBy,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.forTenant(tenantId).task.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);
    return this.prisma.forTenant(tenantId).task.delete({ where: { id } });
  }
}
