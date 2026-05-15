import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(
    tenantId: string,
    period?: string,
    from?: string,
    to?: string,
  ) {
    const scoped = this.prisma.forTenant(tenantId);
    const where: Record<string, unknown> = {};
    if (period) where['period'] = period;
    if (from || to) {
      where['periodStart'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    return scoped.analyticsSnapshot.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });
  }

  async getStaffWorkload(tenantId: string) {
    const scoped = this.prisma.forTenant(tenantId);
    const now = new Date();

    const [users, activeCases, overdueTasks] = await Promise.all([
      scoped.user.findMany({
        where: { deletedAt: null, active: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      }),
      scoped.case.groupBy({
        by: ['assignedToId'],
        where: {
          deletedAt: null,
          archivedAt: null,
          status: { notIn: ['archived'] },
        },
        _count: { id: true },
      }) as Promise<
        Array<{ assignedToId: string | null; _count: { id: number } }>
      >,
      scoped.task.findMany({
        where: { completed: false, dueDate: { lt: now } },
        select: { caseId: true },
      }),
    ]);

    // Map caseId → assignedToId using the active cases we already have context on
    const overdueTaskCaseIds = overdueTasks.map((t) => t.caseId);
    const caseAssignments =
      overdueTaskCaseIds.length > 0
        ? await scoped.case.findMany({
            where: { id: { in: overdueTaskCaseIds } },
            select: { id: true, assignedToId: true },
          })
        : [];

    const caseToUser = new Map(
      caseAssignments.map((c) => [c.id, c.assignedToId]),
    );
    const overdueByUser = new Map<string, number>();
    for (const task of overdueTasks) {
      const userId = caseToUser.get(task.caseId) ?? null;
      if (userId)
        overdueByUser.set(userId, (overdueByUser.get(userId) ?? 0) + 1);
    }

    const activeCaseByUser = new Map(
      activeCases.map((r) => [r.assignedToId, r._count.id]),
    );

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      activeCases: activeCaseByUser.get(u.id) ?? 0,
      overdueTaskCount: overdueByUser.get(u.id) ?? 0,
    }));
  }

  async computeAndSave(tenantId: string, period: string, periodStart: string) {
    const scoped = this.prisma.forTenant(tenantId);

    const [casesByStatus, totalRevenue] = await Promise.all([
      scoped.case.groupBy({ by: ['status'], _count: true }),
      scoped.payment.aggregate({ _sum: { amountPaid: true } }),
    ]);

    const metrics = {
      casesByStatus,
      totalRevenue: totalRevenue._sum.amountPaid ?? 0,
    };

    return scoped.analyticsSnapshot.create({
      data: {
        tenantId,
        period,
        periodStart: new Date(periodStart),
        metrics,
      },
    });
  }
}
