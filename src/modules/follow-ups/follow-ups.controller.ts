import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FollowUpsService } from './follow-ups.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('follow-ups')
@ApiBearerAuth()
@Controller('cases/:caseId/follow-ups')
export class FollowUpsController {
  constructor(private readonly service: FollowUpsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule grief follow-up emails for a contact on a case' })
  @ApiResponse({ status: 201, description: 'Follow-ups scheduled (1w, 1mo, 6mo, 1yr)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  schedule(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body('contactId') contactId: string,
  ) {
    return this.service.scheduleForCase(user.tenantId, caseId, contactId);
  }

  @Get()
  @ApiOperation({ summary: 'List all follow-ups scheduled for a case' })
  @ApiResponse({ status: 200, description: 'Returns array of follow-up records' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.service.findByCase(user.tenantId, caseId);
  }
}
