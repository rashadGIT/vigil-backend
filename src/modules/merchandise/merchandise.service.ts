import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MerchandiseCategory } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMerchandiseItemDto } from './dto/create-merchandise-item.dto';
import { UpdateMerchandiseItemDto } from './dto/update-merchandise-item.dto';
import { AddCaseMerchandiseDto } from './dto/add-case-merchandise.dto';

@Injectable()
export class MerchandiseService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateMerchandiseItemDto) {
    return this.prisma.forTenant(tenantId).merchandiseItem.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        priceRetail: dto.priceRetail,
        priceCost: dto.priceCost ?? null,
        photoUrls: dto.photoUrls ?? [],
        sku: dto.sku ?? null,
        inStock: dto.inStock ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  findAll(tenantId: string, category?: MerchandiseCategory, inStock?: boolean) {
    return this.prisma.forTenant(tenantId).merchandiseItem.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(inStock !== undefined ? { inStock } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.forTenant(tenantId).merchandiseItem.findFirst({
      where: { id },
    });
    if (!item) throw new NotFoundException(`Merchandise item ${id} not found`);
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateMerchandiseItemDto) {
    await this.findOne(tenantId, id);
    return this.prisma.forTenant(tenantId).merchandiseItem.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const hasSelections = await this.prisma.forTenant(tenantId).caseMerchandise.count({
      where: { itemId: id },
    });
    if (hasSelections > 0) {
      // Soft delete — mark out of stock instead of hard delete
      return this.prisma.forTenant(tenantId).merchandiseItem.update({
        where: { id },
        data: { inStock: false },
      });
    }
    return this.prisma.forTenant(tenantId).merchandiseItem.delete({
      where: { id },
    });
  }

  async addToCase(tenantId: string, caseId: string, dto: AddCaseMerchandiseDto) {
    const item = await this.findOne(tenantId, dto.itemId);
    if (!item.inStock) {
      throw new BadRequestException(`Item ${dto.itemId} is not in stock`);
    }
    return this.prisma.forTenant(tenantId).caseMerchandise.create({
      data: {
        tenantId,
        caseId,
        itemId: dto.itemId,
        quantity: dto.quantity ?? 1,
        priceAtTime: item.priceRetail,
        notes: dto.notes ?? null,
      },
      include: { item: true },
    });
  }

  findByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).caseMerchandise.findMany({
      where: { caseId },
      include: { item: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeFromCase(tenantId: string, caseId: string, selectionId: string) {
    const selection = await this.prisma.forTenant(tenantId).caseMerchandise.findFirst({
      where: { id: selectionId, caseId },
    });
    if (!selection) {
      throw new NotFoundException(`Selection ${selectionId} not found on case ${caseId}`);
    }
    return this.prisma.forTenant(tenantId).caseMerchandise.delete({
      where: { id: selectionId },
    });
  }
}
