import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DeathCertificateService } from './death-certificate.service';
import { CreateDeathCertificateDto } from './dto/create-death-certificate.dto';
import { UpdateDeathCertificateDto } from './dto/update-death-certificate.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('death-certificate')
@ApiBearerAuth()
@Controller('cases/:caseId/death-certificate')
export class DeathCertificateController {
  constructor(private readonly deathCertificateService: DeathCertificateService) {}

  @Post()
  @ApiOperation({ summary: 'Create death certificate record for a case' })
  @ApiResponse({ status: 201, description: 'Death certificate record created' })
  @ApiResponse({ status: 409, description: 'Death certificate already exists for this case' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: CreateDeathCertificateDto,
  ) {
    return this.deathCertificateService.create(user.tenantId, caseId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get death certificate record for a case' })
  @ApiResponse({ status: 200, description: 'Returns death certificate record' })
  @ApiResponse({ status: 404, description: 'No death certificate record found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  get(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.deathCertificateService.findByCase(user.tenantId, caseId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update death certificate record for a case' })
  @ApiResponse({ status: 200, description: 'Death certificate record updated' })
  @ApiResponse({ status: 404, description: 'No death certificate record found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: UpdateDeathCertificateDto,
  ) {
    return this.deathCertificateService.update(user.tenantId, caseId, dto);
  }
}
