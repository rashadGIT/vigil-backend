import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { ComputeSnapshotDto, GetSnapshotDto } from './dto/analytics.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { InternalOnly } from '../../common/decorators/internal-only.decorator';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('staff-workload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active case and overdue task counts per staff member' })
  @ApiResponse({ status: 200, description: 'Returns workload summary per user' })
  getStaffWorkload(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getStaffWorkload(user.tenantId);
  }

  @Get('snapshot')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics snapshots for the current tenant' })
  @ApiResponse({ status: 200, description: 'Returns matching analytics snapshots' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSnapshot(@CurrentUser() user: AuthUser, @Query() query: GetSnapshotDto) {
    return this.analyticsService.getSnapshot(user.tenantId, query.period, query.from, query.to);
  }

  @Post('snapshot')
  @InternalOnly()
  @ApiOperation({ summary: 'Trigger snapshot computation (n8n internal)' })
  @ApiResponse({ status: 201, description: 'Snapshot computed and saved' })
  @ApiResponse({ status: 401, description: 'Invalid internal key' })
  computeSnapshot(@Body() dto: ComputeSnapshotDto) {
    return this.analyticsService.computeAndSave(dto.tenantId, dto.period, dto.periodStart);
  }
}
