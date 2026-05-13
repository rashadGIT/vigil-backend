import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const TRACKING_STATUSES = [
  'pending_pickup',
  'in_transit',
  'at_facility',
  'in_preparation',
  'ready',
  'at_service',
  'at_disposition',
  'complete',
] as const;

export class TrackingDto {
  @ApiProperty({
    description: 'Current status in the chain of custody',
    enum: TRACKING_STATUSES,
    example: 'at_facility',
  })
  @IsIn(TRACKING_STATUSES)
  status!: string;

  @ApiProperty({ description: 'Physical location description', example: 'Preparation room B', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}
