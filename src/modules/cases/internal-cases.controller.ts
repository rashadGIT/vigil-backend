import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { InternalOnly } from '../../common/decorators/internal-only.decorator';
import { InternalOnlyGuard } from '../../common/guards/internal-only.guard';
import { CasesService } from './cases.service';

@Controller('internal/cases')
@UseGuards(InternalOnlyGuard)
export class InternalCasesController {
  private readonly logger = new Logger(InternalCasesController.name);

  constructor(private readonly casesService: CasesService) {}

  @Get('pending-hard-delete')
  @InternalOnly()
  async pendingHardDelete() {
    this.logger.log('Running data retention hard delete');
    const result = await this.casesService.hardDeleteExpiredCases();
    this.logger.log(`Deleted ${result.deletedCount} expired cases`);
    return result;
  }

  @Get('overdue-tasks')
  @InternalOnly()
  async overdueTasks() {
    return this.casesService.getOverdueTaskSummary();
  }
}
