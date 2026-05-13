import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { InternalCasesController } from './internal-cases.controller';
import { CasesService } from './cases.service';
import { N8nModule } from '../n8n/n8n.module';

@Module({
  imports: [N8nModule],
  controllers: [CasesController, InternalCasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
