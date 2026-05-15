import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetSnapshotDto {
  @ApiProperty({
    description: 'Period type (monthly, weekly, yearly)',
    example: 'monthly',
    required: false,
  })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiProperty({
    description: 'Start of date range (ISO string)',
    example: '2026-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({
    description: 'End of date range (ISO string)',
    example: '2026-12-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  to?: string;
}

export class ComputeSnapshotDto {
  @ApiProperty({
    description: 'Tenant ID to compute snapshot for',
    example: 'clx1tenant',
  })
  @IsString()
  tenantId!: string;

  @ApiProperty({
    description: 'Period type (monthly, weekly, yearly)',
    example: 'monthly',
  })
  @IsString()
  period!: string;

  @ApiProperty({
    description: 'Start of the period (ISO string)',
    example: '2026-05-01T00:00:00.000Z',
  })
  @IsString()
  periodStart!: string;
}
