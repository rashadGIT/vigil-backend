import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CremationAuthService } from './cremation-auth.service';
import { CreateCremationAuthDto } from './dto/create-cremation-auth.dto';
import { UpdateCremationAuthDto } from './dto/update-cremation-auth.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cremation-auth')
@ApiBearerAuth()
@Controller('cases/:caseId/cremation-auth')
export class CremationAuthController {
  constructor(private readonly cremationAuthService: CremationAuthService) {}

  @Post()
  @ApiOperation({ summary: 'Create cremation authorization record for a case' })
  @ApiResponse({ status: 201, description: 'Cremation authorization created' })
  @ApiResponse({ status: 409, description: 'Cremation authorization already exists for this case' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: CreateCremationAuthDto,
  ) {
    return this.cremationAuthService.create(user.tenantId, caseId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get cremation authorization record for a case' })
  @ApiResponse({ status: 200, description: 'Returns cremation authorization record' })
  @ApiResponse({ status: 404, description: 'No cremation authorization found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  get(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.cremationAuthService.findByCase(user.tenantId, caseId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update cremation authorization record for a case' })
  @ApiResponse({ status: 200, description: 'Cremation authorization updated' })
  @ApiResponse({ status: 404, description: 'No cremation authorization found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: UpdateCremationAuthDto,
  ) {
    return this.cremationAuthService.update(user.tenantId, caseId, dto);
  }

  @Post('clear')
  @ApiOperation({ summary: 'Mark waiting period as cleared — verifies elapsed time before proceeding' })
  @ApiResponse({ status: 201, description: 'Waiting period cleared, status set to cleared' })
  @ApiResponse({ status: 400, description: 'Waiting period not yet elapsed or authorization missing' })
  @ApiResponse({ status: 404, description: 'No cremation authorization found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  clear(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.cremationAuthService.clearWaitingPeriod(user.tenantId, caseId);
  }

  @Post('performed')
  @ApiOperation({ summary: 'Mark cremation as performed — requires waiting period to be cleared first' })
  @ApiResponse({ status: 201, description: 'Cremation marked as performed' })
  @ApiResponse({ status: 400, description: 'Waiting period has not been cleared' })
  @ApiResponse({ status: 404, description: 'No cremation authorization found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  performed(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.cremationAuthService.markPerformed(user.tenantId, caseId);
  }
}
