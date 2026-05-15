import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CemeteryService } from './cemetery.service';
import { UpsertCemeteryDto } from './dto/upsert-cemetery.dto';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('cemetery')
@ApiBearerAuth()
@Controller('cases/:caseId/cemetery')
export class CemeteryController {
  constructor(private readonly cemeteryService: CemeteryService) {}

  @Post()
  @ApiOperation({ summary: 'Create cemetery coordination record for a case' })
  @ApiResponse({ status: 201 })
  create(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: UpsertCemeteryDto,
  ) {
    return this.cemeteryService.upsert(user.tenantId, caseId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get cemetery coordination record for a case' })
  @ApiResponse({ status: 404 })
  findByCase(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.cemeteryService.findByCase(user.tenantId, caseId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update cemetery coordination record for a case' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: UpsertCemeteryDto,
  ) {
    return this.cemeteryService.upsert(user.tenantId, caseId, dto);
  }
}
