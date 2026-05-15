import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeathCertificateDto {
  @ApiProperty({
    description: 'Full legal name of the deceased',
    example: 'Margaret Ann Williams',
  })
  @IsString()
  deceasedFullName!: string;

  @ApiProperty({
    description: 'Date of death (ISO 8601)',
    example: '2026-05-01T00:00:00.000Z',
  })
  @IsDateString()
  dateOfDeath!: string;

  @ApiProperty({
    description: 'Place where death occurred',
    example: 'Cleveland Clinic, Cleveland OH',
    required: false,
  })
  @IsOptional()
  @IsString()
  placeOfDeath?: string;

  @ApiProperty({
    description: 'Cause of death as recorded by physician',
    example: 'Cardiopulmonary arrest',
    required: false,
  })
  @IsOptional()
  @IsString()
  causeOfDeath?: string;

  @ApiProperty({
    description: 'Number of certified copies ordered from the state',
    example: 8,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  certifiedCopiesOrdered?: number;

  @ApiProperty({
    description: 'Number of certified copies received from the state',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  certifiedCopiesReceived?: number;

  @ApiProperty({
    description: 'Date/time certificate was filed in EDRS',
    example: '2026-05-03T14:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  edrsFiledAt?: string;

  @ApiProperty({
    description: 'Date/time certificate was filed with the state registrar',
    example: '2026-05-04T10:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  stateFiledAt?: string;

  @ApiProperty({
    description: 'Attending or pronouncing physician name',
    example: 'Dr. James Okoye',
    required: false,
  })
  @IsOptional()
  @IsString()
  physicianName?: string;

  @ApiProperty({
    description: 'Date/time physician signed the certificate',
    example: '2026-05-02T09:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  physicianSignedAt?: string;

  @ApiProperty({
    description: 'Current status of the death certificate',
    example: 'pending',
    enum: ['pending', 'physician_signed', 'filed', 'certified_copies_received'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Internal notes about the certificate process',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
