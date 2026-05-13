import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { N8nEvent } from '../n8n/n8n-events.enum';
import { UpsertVendorDto, AssignVendorDto } from './dto/vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly n8n: N8nService,
  ) {}

  findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).vendor.findMany({
      where: { deletedAt: null, archivedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  create(tenantId: string, dto: UpsertVendorDto) {
    return this.prisma.forTenant(tenantId).vendor.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: UpsertVendorDto) {
    const existing = await this.prisma.forTenant(tenantId).vendor.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Vendor ${id} not found`);
    return this.prisma.forTenant(tenantId).vendor.update({ where: { id }, data: dto });
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.forTenant(tenantId).vendor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignToCase(tenantId: string, caseId: string, dto: AssignVendorDto) {
    const assignment = await this.prisma.forTenant(tenantId).vendorAssignment.create({
      data: { tenantId, caseId, vendorId: dto.vendorId, role: dto.role ?? null },
    });
    // VEND-03 — fire staff notification via n8n
    await this.n8n.trigger(N8nEvent.STAFF_NOTIFY, {
      event: 'vendor_assigned',
      tenantId,
      caseId,
      vendorId: dto.vendorId,
      assignmentId: assignment.id,
    });
    return assignment;
  }

  findAssignmentsByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).vendorAssignment.findMany({
      where: { caseId },
      include: { vendor: true },
    });
  }
}
