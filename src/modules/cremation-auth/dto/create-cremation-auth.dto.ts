import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCremationAuthDto {
  @ApiProperty({ description: 'Full name of the person authorizing cremation', example: 'Robert Williams' })
  @IsString()
  authorizerName!: string;

  @ApiProperty({ description: 'Relationship of authorizer to deceased', example: 'Son' })
  @IsString()
  authorizerRelationship!: string;

  @ApiProperty({ description: 'Phone number of the authorizer', example: '+12165550193', required: false })
  @IsOptional()
  @IsString()
  authorizerPhone?: string;

  @ApiProperty({ description: 'Email address of the authorizer', example: 'rwilliams@email.com', required: false })
  @IsOptional()
  @IsString()
  authorizerEmail?: string;

  @ApiProperty({ description: 'Date/time authorization was obtained', example: '2026-05-02T11:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  authorizedAt?: string;

  @ApiProperty({ description: 'Mandatory waiting period in hours before cremation may proceed', example: 24, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  waitingPeriodHours?: number;

  @ApiProperty({ description: 'Cremation facility name and address', example: 'Lakeview Crematory, 1200 Shore Blvd, Cleveland OH', required: false })
  @IsOptional()
  @IsString()
  cremationLocation?: string;

  @ApiProperty({ description: 'Instructions for disposition of remains', example: 'Family will pick up urn at funeral home', required: false })
  @IsOptional()
  @IsString()
  dispositionInstructions?: string;

  @ApiProperty({
    description: 'Current status of cremation authorization',
    example: 'pending',
    enum: ['pending', 'authorized', 'waiting_period', 'cleared', 'performed'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Internal notes about the cremation authorization', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
