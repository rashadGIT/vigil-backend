import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertEventDto {
  @ApiProperty({
    description: 'Title of the calendar event',
    example: 'Graveside Service — Williams',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Type of event',
    enum: EventType,
    example: 'service',
  })
  @IsEnum(EventType)
  eventType!: EventType;

  @ApiProperty({
    description: 'Case ID this event is associated with',
    example: 'cas_01hxyz',
    required: false,
  })
  @IsOptional()
  @IsString()
  caseId?: string;

  @ApiProperty({
    description: 'Event start time (ISO 8601)',
    example: '2024-12-05T14:00:00Z',
  })
  @IsDateString()
  startTime!: string;

  @ApiProperty({
    description: 'Event end time (ISO 8601)',
    example: '2024-12-05T15:30:00Z',
  })
  @IsDateString()
  endTime!: string;

  @ApiProperty({
    description: 'Location or venue name',
    example: 'Maple Cemetery, Plot 44B',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Additional notes for the event',
    example: 'Family requests military honors',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'IDs of staff members assigned to this event',
    example: ['usr_01hxyz', 'usr_02habc'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  staffIds?: string[];
}
