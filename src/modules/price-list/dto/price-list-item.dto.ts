import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PriceCategory } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertPriceListItemDto {
  @ApiProperty({ description: 'FTC GPL category for this item', enum: PriceCategory, example: 'professional_services' })
  @IsEnum(PriceCategory)
  category!: PriceCategory;

  @ApiProperty({ description: 'Name of the service or merchandise item', example: 'Direct Cremation' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Price in dollars (must be >= 0)', example: 1495 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'Whether sales tax applies to this item', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @ApiProperty({ description: 'Display sort order on the GPL', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
