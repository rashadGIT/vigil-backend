import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFirstCallDto {
  @ApiProperty({ description: 'Date/time the funeral home was first notified', example: '2026-05-01T02:15:00.000Z' })
  @IsDateString()
  calledAt!: string;

  @ApiProperty({ description: 'Name of the person who called', example: 'Robert Williams', required: false })
  @IsOptional()
  @IsString()
  calledBy?: string;

  @ApiProperty({ description: 'Relationship of caller to deceased', example: 'Son', required: false })
  @IsOptional()
  @IsString()
  callerRelationship?: string;

  @ApiProperty({ description: 'Address where removal will occur', example: '4201 Euclid Ave, Cleveland OH 44103', required: false })
  @IsOptional()
  @IsString()
  removalAddress?: string;

  @ApiProperty({
    description: 'Type of location for removal',
    example: 'hospital',
    enum: ['hospital', 'home', 'nursing_facility', 'hospice', 'other'],
    required: false,
  })
  @IsOptional()
  @IsString()
  removalLocation?: string;

  @ApiProperty({ description: 'Date/time removal was completed', example: '2026-05-01T04:45:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  removalAt?: string;

  @ApiProperty({ description: 'Staff member who performed the removal', example: 'James Barnett', required: false })
  @IsOptional()
  @IsString()
  removedBy?: string;

  @ApiProperty({ description: 'Family member who authorized the removal', example: 'Robert Williams', required: false })
  @IsOptional()
  @IsString()
  authorizedBy?: string;

  @ApiProperty({
    description: 'Method used to obtain authorization',
    example: 'verbal',
    enum: ['verbal', 'written', 'email'],
    required: false,
  })
  @IsOptional()
  @IsString()
  authorizationMethod?: string;

  @ApiProperty({ description: 'Special handling instructions from the family or facility', required: false })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiProperty({ description: 'Estimated weight of the deceased in pounds (for removal planning)', example: 185, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  weightEstimate?: number;
}
