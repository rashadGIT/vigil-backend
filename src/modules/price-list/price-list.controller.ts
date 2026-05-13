import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PriceListService } from './price-list.service';
import { UpsertPriceListItemDto } from './dto/price-list-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('price-list')
@ApiBearerAuth()
@Controller()
export class PriceListController {
  constructor(private readonly service: PriceListService) {}

  @Get('price-list')
  @ApiOperation({ summary: 'List all price list items for the tenant (FTC GPL)' })
  @ApiResponse({ status: 200, description: 'Returns array of price list items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user.tenantId);
  }

  @Roles('funeral_director')
  @Post('price-list')
  @ApiOperation({ summary: 'Add a price list item (funeral director only)' })
  @ApiResponse({ status: 201, description: 'Price list item created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertPriceListItemDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Roles('funeral_director')
  @Patch('price-list/:id')
  @ApiOperation({ summary: 'Update a price list item (funeral director only)' })
  @ApiResponse({ status: 200, description: 'Price list item updated' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertPriceListItemDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Post('price-list/view')
  @ApiOperation({ summary: 'Log a GPL view event for FTC compliance audit trail' })
  @ApiResponse({ status: 201, description: 'View event logged' })
  logView(@CurrentUser() user: AuthUser) {
    return this.service.logGplView(user.tenantId, user.sub);
  }

  @Get('price-list/audit')
  @ApiOperation({ summary: 'Get GPL view/send audit log for FTC compliance' })
  @ApiResponse({ status: 200, description: 'Returns GPL audit events' })
  getAuditLog(@CurrentUser() user: AuthUser) {
    return this.service.getGplAuditLog(user.tenantId);
  }

  @Post('cases/:caseId/gpl/generate')
  @ApiOperation({ summary: 'Generate FTC GPL PDF for a case and upload to S3' })
  @ApiResponse({ status: 201, description: 'Returns S3 URL of generated PDF' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  generate(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.service.generateGplPdf(user.tenantId, caseId, user.sub);
  }
}
