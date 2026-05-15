import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertCemeteryDto } from './dto/upsert-cemetery.dto';

@Injectable()
export class CemeteryService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(tenantId: string, caseId: string, dto: UpsertCemeteryDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.cemeteryRecord.findFirst({
      where: { caseId },
    });

    const data = {
      cemeteryName: dto.cemeteryName ?? null,
      cemeteryAddress: dto.cemeteryAddress ?? null,
      cemeteryPhone: dto.cemeteryPhone ?? null,
      sectionLotGrave: dto.sectionLotGrave ?? null,
      intermentType: dto.intermentType ?? null,
      openingClosingOrdered: dto.openingClosingOrdered ?? undefined,
      openingClosingOrderedAt: dto.openingClosingOrderedAt
        ? new Date(dto.openingClosingOrderedAt)
        : null,
      intermentScheduledAt: dto.intermentScheduledAt
        ? new Date(dto.intermentScheduledAt)
        : null,
      intermentCompletedAt: dto.intermentCompletedAt
        ? new Date(dto.intermentCompletedAt)
        : null,
      permitNumber: dto.permitNumber ?? null,
      notes: dto.notes ?? null,
    };

    if (existing) {
      return scoped.cemeteryRecord.update({ where: { id: existing.id }, data });
    }
    return scoped.cemeteryRecord.create({
      data: { ...data, tenantId, caseId },
    });
  }

  async findByCase(tenantId: string, caseId: string) {
    const record = await this.prisma
      .forTenant(tenantId)
      .cemeteryRecord.findFirst({
        where: { caseId },
      });
    if (!record)
      throw new NotFoundException(`No cemetery record for case ${caseId}`);
    return record;
  }
}
