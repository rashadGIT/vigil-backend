import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertEventDto } from './dto/calendar-event.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Double-booking prevention (CAL-03): reject if any assigned staff member
   * already has an event whose time range overlaps the requested window.
   */
  private async assertNoDoubleBooking(
    tenantId: string,
    staffIds: string[],
    startTime: Date,
    endTime: Date,
    excludeEventId?: string,
  ): Promise<void> {
    if (staffIds.length === 0) return;
    const conflicts = await this.prisma
      .forTenant(tenantId)
      .calendarEventStaff.findMany({
        where: {
          userId: { in: staffIds },
          calendarEvent: {
            ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        },
        include: { calendarEvent: true },
      });
    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Double-booking: staff ${conflicts[0].userId} already booked at ${conflicts[0].calendarEvent.startTime.toISOString()}`,
      );
    }
  }

  async create(tenantId: string, dto: UpsertEventDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException('endTime must be after startTime');
    }
    await this.assertNoDoubleBooking(tenantId, dto.staffIds ?? [], start, end);

    return this.prisma.forTenant(tenantId).calendarEvent.create({
      data: {
        tenantId,
        title: dto.title,
        eventType: dto.eventType,
        caseId: dto.caseId ?? null,
        startTime: start,
        endTime: end,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
        staff:
          dto.staffIds && dto.staffIds.length > 0
            ? {
                create: dto.staffIds.map((userId) => ({
                  tenantId,
                  userId,
                })),
              }
            : undefined,
      },
      include: { staff: true },
    });
  }

  async findInRange(tenantId: string, from: Date, to: Date) {
    return this.prisma.forTenant(tenantId).calendarEvent.findMany({
      where: {
        startTime: { lt: to },
        endTime: { gt: from },
      },
      include: { staff: true, case: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpsertEventDto) {
    const existing = await this.prisma
      .forTenant(tenantId)
      .calendarEvent.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Event ${id} not found`);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    await this.assertNoDoubleBooking(
      tenantId,
      dto.staffIds ?? [],
      start,
      end,
      id,
    );

    return this.prisma.forTenant(tenantId).calendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        eventType: dto.eventType,
        caseId: dto.caseId ?? null,
        startTime: start,
        endTime: end,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma
      .forTenant(tenantId)
      .calendarEvent.delete({ where: { id } });
  }
}
