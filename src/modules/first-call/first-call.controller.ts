import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FirstCallService } from './first-call.service';
import { CreateFirstCallDto } from './dto/create-first-call.dto';
import { UpdateFirstCallDto } from './dto/update-first-call.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('first-call')
@ApiBearerAuth()
@Controller('cases/:caseId/first-call')
export class FirstCallController {
  constructor(private readonly firstCallService: FirstCallService) {}

  @Post()
  @ApiOperation({ summary: 'Create first call / removal log for a case' })
  @ApiResponse({ status: 201, description: 'First call record created' })
  @ApiResponse({ status: 409, description: 'First call record already exists for this case' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: CreateFirstCallDto,
  ) {
    return this.firstCallService.create(user.tenantId, caseId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get first call / removal log for a case' })
  @ApiResponse({ status: 200, description: 'Returns first call record' })
  @ApiResponse({ status: 404, description: 'No first call record found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  get(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.firstCallService.findByCase(user.tenantId, caseId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update first call / removal log for a case' })
  @ApiResponse({ status: 200, description: 'First call record updated' })
  @ApiResponse({ status: 404, description: 'No first call record found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: UpdateFirstCallDto,
  ) {
    return this.firstCallService.update(user.tenantId, caseId, dto);
  }
}
