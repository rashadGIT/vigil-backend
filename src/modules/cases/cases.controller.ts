import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CaseStatus } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CaseFilterDto } from './dto/case-filter.dto';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('cases')
@ApiBearerAuth()
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new case' })
  @ApiResponse({ status: 201, description: 'Case created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCaseDto) {
    return this.casesService.create(user.tenantId, dto);
  }

  @Get('reports/revenue')
  @ApiOperation({ summary: 'Revenue report' })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'ISO date string (inclusive)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'ISO date string (inclusive)',
  })
  @ApiResponse({ status: 200 })
  getRevenueReport(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.casesService.getRevenueReport(user.tenantId, from, to);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get case statistics for the tenant dashboard' })
  @ApiResponse({ status: 200, description: 'Returns case counts by status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.casesService.getStats(user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all cases with optional filters' })
  @ApiResponse({ status: 200, description: 'Returns array of cases' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: AuthUser, @Query() filter: CaseFilterDto) {
    return this.casesService.findAll(user.tenantId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single case by ID' })
  @ApiResponse({ status: 200, description: 'Returns the case' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.casesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a case' })
  @ApiResponse({ status: 200, description: 'Case updated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
  ) {
    return this.casesService.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update only the status of a case' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: CaseStatus,
  ) {
    return this.casesService.updateStatus(user.tenantId, id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a case (recoverable for 90 days)' })
  @ApiResponse({ status: 200, description: 'Case soft-deleted' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  softDelete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.casesService.softDelete(user.tenantId, id);
  }
}
