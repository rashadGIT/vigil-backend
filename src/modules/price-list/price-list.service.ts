import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfService } from '../documents/pdf.service';
import { S3Service } from '../documents/s3.service';
import { UpsertPriceListItemDto } from './dto/price-list-item.dto';

@Injectable()
export class PriceListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly s3: S3Service,
  ) {}

  findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).priceListItem.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  create(tenantId: string, dto: UpsertPriceListItemDto) {
    return this.prisma.forTenant(tenantId).priceListItem.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: UpsertPriceListItemDto) {
    const existing = await this.prisma.forTenant(tenantId).priceListItem.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Item ${id} not found`);
    return this.prisma.forTenant(tenantId).priceListItem.update({ where: { id }, data: dto });
  }

  async logGplView(tenantId: string, userId: string): Promise<void> {
    await this.prisma.forTenant(tenantId).auditLog.create({
      data: { tenantId, userId, action: 'gpl_view', entityType: 'price_list', entityId: tenantId },
    });
  }

  async getGplAuditLog(tenantId: string) {
    return this.prisma.forTenant(tenantId).auditLog.findMany({
      where: { action: { in: ['gpl_view', 'gpl_sent'] } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async generateGplPdf(tenantId: string, caseId: string, userId: string): Promise<{ s3Key: string }> {
    const buffer = await this.pdfService.generateGpl(caseId, tenantId);
    const s3Key = this.s3.buildKey(tenantId, caseId, `gpl-${Date.now()}.pdf`);
    await this.s3.uploadBuffer(s3Key, buffer, 'application/pdf');

    await this.prisma.forTenant(tenantId).document.create({
      data: {
        tenantId,
        caseId,
        documentType: 'invoice',
        fileName: `GPL-${new Date().toISOString().slice(0, 10)}.pdf`,
        s3Key,
        uploaded: true,
      },
    });

    await this.prisma.forTenant(tenantId).auditLog.create({
      data: { tenantId, userId, action: 'gpl_sent', entityType: 'case', entityId: caseId },
    });

    return { s3Key };
  }
}
