import { Module } from '@nestjs/common';
import { FamilyPortalController } from './family-portal.controller';
import { FamilyPortalService } from './family-portal.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [FamilyPortalController],
  providers: [FamilyPortalService],
  exports: [FamilyPortalService],
})
export class FamilyPortalModule {}
