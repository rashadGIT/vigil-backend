import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ListUsersFilterDto } from './dto/list-users-filter.dto';
import { SuperAdminOnly } from '../../common/decorators/super-admin-only.decorator';

@ApiTags('super-admin')
@ApiBearerAuth()
@SuperAdminOnly()
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants (super admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tenants with user and case counts',
  })
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
  @ApiOperation({
    summary: 'Update a tenant planTier or active status (super admin only)',
  })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.updateTenant(id, dto);
  }

  @Get('tenants/:id/cases')
  @ApiOperation({
    summary: 'View cases for any tenant (super admin support view)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns up to 100 most recent cases for the tenant',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  getTenantCases(@Param('id') id: string) {
    return this.service.getTenantCases(id);
  }

  @Post('impersonate/:tenantId')
  @ApiOperation({
    summary:
      'Issue a 1-hour impersonation token scoped to a tenant (super admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns short-lived impersonation token',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Tenant is inactive' })
  impersonate(@Param('tenantId') tenantId: string) {
    return this.service.createImpersonationToken(tenantId);
  }

  // ── User Management ──────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({
    summary: 'List all users across tenants (optional tenantId filter)',
  })
  @ApiResponse({ status: 200, description: 'Returns users with tenant info' })
  listUsers(@Query() filter: ListUsersFilterDto) {
    return this.service.listUsers(filter);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a user in any tenant' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Email already exists in Cognito' })
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.service.createUserInTenant(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user role or active status' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.service.updateUser(id, dto);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Trigger Cognito password reset for a user' })
  @ApiResponse({ status: 201, description: 'Password reset email sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resetUserPassword(@Param('id') id: string) {
    return this.service.resetUserPassword(id);
  }
}
