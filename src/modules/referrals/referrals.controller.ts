import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller()
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post('cases/:caseId/referrals')
  @ApiOperation({ summary: 'Add a referral source to a case' })
  @ApiResponse({ status: 201, description: 'Referral created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: CreateReferralDto,
  ) {
    return this.referralsService.create(user.tenantId, caseId, dto);
  }

  @Get('cases/:caseId/referrals')
  @ApiOperation({ summary: 'List all referral sources for a case' })
  @ApiResponse({ status: 200, description: 'Returns referral sources' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByCase(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.referralsService.findByCase(user.tenantId, caseId);
  }

  @Delete('referrals/:id')
  @ApiOperation({ summary: 'Delete a referral source' })
  @ApiResponse({ status: 200, description: 'Referral deleted' })
  @ApiResponse({ status: 404, description: 'Referral not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.referralsService.remove(user.tenantId, id);
  }
}
