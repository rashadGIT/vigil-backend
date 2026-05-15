import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlanTier {
  pilot = 'pilot',
  starter = 'starter',
  growth = 'growth',
  enterprise = 'enterprise',
}

export class CreateTenantDto {
  @ApiProperty({ example: 'Sunrise Memorial Chapel' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    example: 'sunrise-memorial',
    description: 'URL-safe slug, lowercase kebab',
  })
  @IsString()
  @MinLength(2)
  slug!: string;

  @ApiPropertyOptional({ enum: PlanTier, default: PlanTier.pilot })
  @IsOptional()
  @IsEnum(PlanTier)
  planTier?: PlanTier;
}
