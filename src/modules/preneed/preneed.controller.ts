import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { PreneedService } from './preneed.service';
import { CreatePreneedDto } from './dto/create-preneed.dto';
import { UpdatePreneedDto } from './dto/update-preneed.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('preneed')
@ApiBearerAuth()
@Controller('preneed')
export class PreneedController {
  constructor(private readonly preneedService: PreneedService) {}

  @Post()
  @ApiOperation({ summary: 'Create a pre-need arrangement' })
  @ApiResponse({ status: 201 })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePreneedDto) {
    return this.preneedService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List pre-need arrangements' })
  @ApiQuery({ name: 'status', required: false, description: 'active | converted | cancelled' })
  findAll(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.preneedService.findAll(user.tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pre-need arrangement by ID' })
  @ApiResponse({ status: 404 })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.preneedService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pre-need arrangement' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePreneedDto,
  ) {
    return this.preneedService.update(user.tenantId, id, dto);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert a pre-need arrangement to an at-need case' })
  @ApiResponse({ status: 201, description: 'Returns { arrangement, case }' })
  @ApiResponse({ status: 400, description: 'Already converted or cancelled' })
  @ApiResponse({ status: 404 })
  convert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.preneedService.convert(user.tenantId, id);
  }
}
