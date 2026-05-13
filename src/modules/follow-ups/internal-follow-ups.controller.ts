import { Controller, Patch, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { InternalOnly } from '../../common/decorators/internal-only.decorator';
import { InternalOnlyGuard } from '../../common/guards/internal-only.guard';
import { FollowUpsService } from './follow-ups.service';

@Controller('internal/cases')
@UseGuards(InternalOnlyGuard)
export class InternalFollowUpsController {
  private readonly logger = new Logger(InternalFollowUpsController.name);

  constructor(private readonly followUpsService: FollowUpsService) {}

  @Patch(':caseId/followup-complete')
  @InternalOnly()
  async followupComplete(
    @Param('caseId') caseId: string,
    @Body('tenantId') tenantId: string,
  ) {
    this.logger.log(`Marking follow-ups complete for case ${caseId}`);
    return this.followUpsService.markAllComplete(tenantId, caseId);
  }
}
