import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpsertCemeteryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cemeteryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cemeteryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cemeteryPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionLotGrave?: string;

  @ApiPropertyOptional({ description: 'ground | mausoleum | columbarium | scattering' })
  @IsOptional()
  @IsString()
  intermentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openingClosingOrdered?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  openingClosingOrderedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  intermentScheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  intermentCompletedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permitNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
