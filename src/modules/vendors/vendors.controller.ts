import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { UpsertVendorDto, AssignVendorDto } from './dto/vendor.dto';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('vendors')
@ApiBearerAuth()
@Controller()
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get('vendors')
  @ApiOperation({ summary: 'List all vendors for the tenant' })
  @ApiResponse({ status: 200, description: 'Returns array of vendors' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user.tenantId);
  }

  @Roles('funeral_director')
  @Post('vendors')
  @ApiOperation({ summary: 'Create a new vendor (funeral director only)' })
  @ApiResponse({ status: 201, description: 'Vendor created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertVendorDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Roles('funeral_director')
  @Patch('vendors/:id')
  @ApiOperation({ summary: 'Update a vendor (funeral director only)' })
  @ApiResponse({ status: 200, description: 'Vendor updated' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertVendorDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Roles('funeral_director')
  @Delete('vendors/:id')
  @ApiOperation({ summary: 'Soft-delete a vendor (funeral director only)' })
  @ApiResponse({ status: 200, description: 'Vendor soft-deleted' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.softDelete(user.tenantId, id);
  }

  @Post('cases/:caseId/vendors')
  @ApiOperation({ summary: 'Assign a vendor to a case' })
  @ApiResponse({ status: 201, description: 'Vendor assigned to case' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  assign(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: AssignVendorDto,
  ) {
    return this.service.assignToCase(user.tenantId, caseId, dto);
  }

  @Get('cases/:caseId/vendors')
  @ApiOperation({ summary: 'List vendors assigned to a case' })
  @ApiResponse({
    status: 200,
    description: 'Returns array of vendor assignments',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAssignments(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
  ) {
    return this.service.findAssignmentsByCase(user.tenantId, caseId);
  }
}
