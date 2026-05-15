import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TrackingDto } from './dto/tracking.dto';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    tenantId: string,
    caseId: string,
    dto: TrackingDto,
    userId: string,
  ) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.decedentTracking.findFirst({
      where: { caseId },
    });
    if (existing) {
      return scoped.decedentTracking.update({
        where: { id: existing.id },
        data: { ...dto, updatedBy: userId },
      });
    }
    return scoped.decedentTracking.create({
      data: { ...dto, tenantId, caseId, updatedBy: userId },
    });
  }

  async findByCase(tenantId: string, caseId: string) {
    const record = await this.prisma
      .forTenant(tenantId)
      .decedentTracking.findFirst({ where: { caseId } });
    if (!record)
      throw new NotFoundException(`No tracking record for case ${caseId}`);
    return record;
  }
}
