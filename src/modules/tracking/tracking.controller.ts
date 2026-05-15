import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { TrackingDto } from './dto/tracking.dto';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('tracking')
@ApiBearerAuth()
@Controller('cases/:caseId/tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post()
  @ApiOperation({
    summary: 'Create or update decedent tracking record for a case',
  })
  @ApiResponse({ status: 201, description: 'Tracking record created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  upsertPost(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: TrackingDto,
  ) {
    return this.trackingService.upsert(user.tenantId, caseId, dto, user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Update decedent tracking status for a case' })
  @ApiResponse({ status: 200, description: 'Tracking record updated' })
  @ApiResponse({ status: 404, description: 'Tracking record not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  upsertPatch(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: TrackingDto,
  ) {
    return this.trackingService.upsert(user.tenantId, caseId, dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get decedent tracking record for a case' })
  @ApiResponse({ status: 200, description: 'Returns tracking record' })
  @ApiResponse({ status: 404, description: 'Tracking record not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByCase(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.trackingService.findByCase(user.tenantId, caseId);
  }
}
