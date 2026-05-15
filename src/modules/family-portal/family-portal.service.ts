import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3Service } from '../documents/s3.service';
import { PresignDto } from '../documents/dto/presign.dto';

@Injectable()
export class FamilyPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  grant(tenantId: string, caseId: string, contactId: string) {
    const accessToken = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    return this.prisma.forTenant(tenantId).familyPortalAccess.create({
      data: { tenantId, caseId, contactId, accessToken, expiresAt },
    });
  }

  async getByToken(accessToken: string) {
    // Token lookup must be unscoped — tenantId is unknown at this point
    const record = await this.prisma.familyPortalAccess.findUnique({
      where: { accessToken },
    });
    if (!record) throw new NotFoundException('Portal access not found');
    if (record.expiresAt < new Date())
      throw new ForbiddenException('Portal access token has expired');

    const scoped = this.prisma.forTenant(record.tenantId);
    const [caseRecord, contacts, documents] = await Promise.all([
      scoped.case.findFirst({ where: { id: record.caseId } }),
      scoped.familyContact.findMany({ where: { caseId: record.caseId } }),
      scoped.document.findMany({ where: { caseId: record.caseId } }),
    ]);

    return { portalAccess: record, case: caseRecord, contacts, documents };
  }

  async requestUpload(accessToken: string, dto: PresignDto) {
    const record = await this.prisma.familyPortalAccess.findUnique({
      where: { accessToken },
    });
    if (!record) throw new NotFoundException('Portal access not found');
    if (record.expiresAt < new Date())
      throw new ForbiddenException('Portal access token has expired');

    const s3Key = this.s3.buildKey(
      record.tenantId,
      record.caseId,
      dto.fileName,
    );
    const uploadUrl = await this.s3.getPresignedPut(s3Key, dto.contentType);

    const doc = await this.prisma.forTenant(record.tenantId).document.create({
      data: {
        tenantId: record.tenantId,
        caseId: record.caseId,
        documentType: dto.documentType,
        fileName: dto.fileName,
        s3Key,
        uploadedById: record.contactId,
        uploaded: false,
      },
    });

    return { uploadUrl, documentId: doc.id, s3Key };
  }

  async markViewed(accessToken: string) {
    // Token lookup must be unscoped — tenantId is unknown at this point
    const record = await this.prisma.familyPortalAccess.findUnique({
      where: { accessToken },
    });
    if (!record) throw new NotFoundException('Portal access not found');
    if (record.expiresAt < new Date())
      throw new ForbiddenException('Portal access token has expired');

    return this.prisma.forTenant(record.tenantId).familyPortalAccess.update({
      where: { id: record.id },
      data: { lastViewed: new Date() },
    });
  }
}
