import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3Service } from './s3.service';
import { PresignDto } from './dto/presign.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async createPresign(
    tenantId: string,
    caseId: string,
    userId: string,
    dto: PresignDto,
  ): Promise<{ uploadUrl: string; documentId: string; s3Key: string }> {
    const s3Key = this.s3.buildKey(tenantId, caseId, dto.fileName);
    const uploadUrl = await this.s3.getPresignedPut(s3Key, dto.contentType);

    const doc = await this.prisma.forTenant(tenantId).document.create({
      data: {
        tenantId,
        caseId,
        documentType: dto.documentType,
        fileName: dto.fileName,
        s3Key,
        uploadedById: userId,
        uploaded: false,
      },
    });

    return { uploadUrl, documentId: doc.id, s3Key };
  }

  async confirmUpload(tenantId: string, documentId: string) {
    const existing = await this.prisma.forTenant(tenantId).document.findFirst({
      where: { id: documentId },
    });
    if (!existing) throw new NotFoundException(`Document ${documentId} not found`);
    return this.prisma.forTenant(tenantId).document.update({
      where: { id: documentId },
      data: { uploaded: true },
    });
  }

  async getSignedUrl(tenantId: string, documentId: string): Promise<{ url: string }> {
    const doc = await this.prisma.forTenant(tenantId).document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);
    return { url: await this.s3.getPresignedGet(doc.s3Key) };
  }

  findByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).document.findMany({
      where: { caseId, deletedAt: null, uploaded: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markGenerated(documentId: string): Promise<void> {
    await this.prisma.document.updateMany({
      where: { id: documentId },
      data: { uploaded: true },
    });
  }

  async softDelete(tenantId: string, documentId: string) {
    const doc = await this.prisma.forTenant(tenantId).document.findFirst({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);
    return this.prisma.forTenant(tenantId).document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
  }
}
