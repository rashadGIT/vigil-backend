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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { MerchandiseCategory } from '@prisma/client';
import { MerchandiseService } from './merchandise.service';
import { CreateMerchandiseItemDto } from './dto/create-merchandise-item.dto';
import { UpdateMerchandiseItemDto } from './dto/update-merchandise-item.dto';
import { AddCaseMerchandiseDto } from './dto/add-case-merchandise.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('merchandise')
@ApiBearerAuth()
@Controller('merchandise')
export class MerchandiseController {
  constructor(private readonly merchandiseService: MerchandiseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a catalog item' })
  @ApiResponse({ status: 201 })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMerchandiseItemDto) {
    return this.merchandiseService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List catalog items' })
  @ApiQuery({ name: 'category', enum: MerchandiseCategory, required: false })
  @ApiQuery({ name: 'inStock', type: Boolean, required: false })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: MerchandiseCategory,
    @Query('inStock') inStock?: string,
  ) {
    const inStockBool = inStock === undefined ? undefined : inStock === 'true';
    return this.merchandiseService.findAll(user.tenantId, category, inStockBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a catalog item by ID' })
  @ApiResponse({ status: 404 })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.merchandiseService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a catalog item' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMerchandiseItemDto,
  ) {
    return this.merchandiseService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a catalog item (soft if in use, hard otherwise)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.merchandiseService.remove(user.tenantId, id);
  }
}

@ApiTags('merchandise')
@ApiBearerAuth()
@Controller('cases/:caseId/merchandise')
export class CaseMerchandiseController {
  constructor(private readonly merchandiseService: MerchandiseService) {}

  @Post()
  @ApiOperation({ summary: 'Add a merchandise item to a case' })
  @ApiResponse({ status: 201 })
  addToCase(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: AddCaseMerchandiseDto,
  ) {
    return this.merchandiseService.addToCase(user.tenantId, caseId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List merchandise selections for a case' })
  findByCase(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.merchandiseService.findByCase(user.tenantId, caseId);
  }

  @Delete(':selectionId')
  @ApiOperation({ summary: 'Remove a merchandise selection from a case' })
  removeFromCase(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Param('selectionId') selectionId: string,
  ) {
    return this.merchandiseService.removeFromCase(user.tenantId, caseId, selectionId);
  }
}
