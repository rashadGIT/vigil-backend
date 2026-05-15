import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { InternalOnly } from '../../common/decorators/internal-only.decorator';
import { InternalOnlyGuard } from '../../common/guards/internal-only.guard';
import { PdfService } from './pdf.service';
import { S3Service } from './s3.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('internal/documents')
@UseGuards(InternalOnlyGuard)
export class InternalDocumentsController {
  private readonly logger = new Logger(InternalDocumentsController.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  @Post('generate-service-program/:caseId')
  @InternalOnly()
  async generateServiceProgram(
    @Param('caseId') caseId: string,
    @Body('tenantId') tenantId: string,
  ) {
    this.logger.log(
      `Generating service program for case ${caseId}, tenant ${tenantId}`,
    );
    const buffer = await this.pdfService.generateServiceProgram(
      caseId,
      tenantId,
    );
    const s3Key = `${tenantId}/${caseId}/service-program.pdf`;
    await this.s3Service.uploadBuffer(s3Key, buffer, 'application/pdf');

    // Create document record linked to case
    const doc = await this.prisma.forTenant(tenantId).document.create({
      data: {
        tenantId,
        caseId,
        documentType: 'service_program',
        fileName: 'service-program.pdf',
        s3Key,
        uploadedById: null, // system-generated
        uploaded: true,
      },
    });

    const signedUrl = await this.s3Service.getPresignedGet(s3Key);
    return { signedUrl, documentId: doc.id, s3Key };
  }
}
