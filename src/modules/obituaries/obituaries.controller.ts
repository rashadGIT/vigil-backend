import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ObituariesService } from './obituaries.service';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('obituaries')
@ApiBearerAuth()
@Controller('cases/:caseId/obituary')
export class ObituariesController {
  constructor(private readonly service: ObituariesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'AI-generate a draft obituary from case data' })
  @ApiResponse({ status: 201, description: 'Obituary draft generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  generate(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.service.generate(user.tenantId, caseId);
  }

  @Get()
  @ApiOperation({ summary: 'Get the obituary for a case' })
  @ApiResponse({ status: 200, description: 'Returns obituary record' })
  @ApiResponse({ status: 404, description: 'Obituary not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  get(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.service.findByCase(user.tenantId, caseId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update obituary draft text and status' })
  @ApiResponse({ status: 200, description: 'Obituary updated' })
  @ApiResponse({ status: 404, description: 'Obituary not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() body: { draftText: string; status?: string },
  ) {
    return this.service.update(
      user.tenantId,
      caseId,
      body.draftText,
      body.status,
    );
  }
}
