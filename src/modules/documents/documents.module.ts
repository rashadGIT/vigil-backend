import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { InternalDocumentsController } from './internal-documents.controller';
import { DocumentsService } from './documents.service';
import { S3Service } from './s3.service';
import { PdfService } from './pdf.service';

@Module({
  controllers: [DocumentsController, InternalDocumentsController],
  providers: [DocumentsService, S3Service, PdfService],
  exports: [DocumentsService, S3Service, PdfService],
})
export class DocumentsModule {}
