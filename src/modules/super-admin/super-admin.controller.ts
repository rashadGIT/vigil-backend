import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SuperAdminOnly } from '../../common/decorators/super-admin-only.decorator';

@ApiTags('super-admin')
@ApiBearerAuth()
@SuperAdminOnly()
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants (super admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all tenants with user and case counts' })
  listTenants() {
    return this.service.listTenants();
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Provision a new tenant (super admin only)' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  createTenant(@Body() dto: CreateTenantDto) {
    return this.service.createTenant(dto);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update a tenant planTier or active status (super admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.updateTenant(id, dto);
  }

  @Get('tenants/:id/cases')
  @ApiOperation({ summary: 'View cases for any tenant (super admin support view)' })
  @ApiResponse({ status: 200, description: 'Returns up to 100 most recent cases for the tenant' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  getTenantCases(@Param('id') id: string) {
    return this.service.getTenantCases(id);
  }

  @Post('impersonate/:tenantId')
  @ApiOperation({ summary: 'Issue a 1-hour impersonation token scoped to a tenant (super admin only)' })
  @ApiResponse({ status: 201, description: 'Returns short-lived impersonation token' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Tenant is inactive' })
  impersonate(@Param('tenantId') tenantId: string) {
    return this.service.createImpersonationToken(tenantId);
  }
}
