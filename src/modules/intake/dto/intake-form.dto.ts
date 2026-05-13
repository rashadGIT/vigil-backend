import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ServiceType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntakeContactDto {
  @ApiProperty({ example: 'James Williams' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'Son' })
  @IsString()
  @MaxLength(80)
  relationship!: string;

  @ApiPropertyOptional({ example: 'james.williams@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+15135551234' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Cincinnati' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'OH' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @ApiPropertyOptional({ example: '45202' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zip?: string;

  @ApiPropertyOptional({ default: true, description: 'Is this contact financially responsible for services?' })
  @IsOptional()
  @IsBoolean()
  isFinanciallyResponsible?: boolean;
}

export class IntakeFormDto {
  @ApiProperty({ example: 'Margaret Anne Williams' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  deceasedName!: string;

  @ApiPropertyOptional({ example: '1942-03-15' })
  @IsOptional()
  @IsDateString()
  deceasedDob?: string;

  @ApiPropertyOptional({ example: '2024-11-20' })
  @IsOptional()
  @IsDateString()
  deceasedDod?: string;

  @ApiProperty({ enum: ServiceType, example: 'burial' })
  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @ApiPropertyOptional({ default: false, description: 'Was the deceased a U.S. military veteran?' })
  @IsOptional()
  @IsBoolean()
  veteranStatus?: boolean;

  @ApiPropertyOptional({ example: 'Cincinnati General Hospital' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeOfDeath?: string;

  @ApiPropertyOptional({ example: 'Natural causes', description: 'Only collected when tenant has this feature enabled' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  causeOfDeath?: string;

  @ApiProperty({ description: 'Primary next-of-kin contact information', type: IntakeContactDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => IntakeContactDto)
  primaryContact!: IntakeContactDto;

  @ApiPropertyOptional({ description: 'Optional second family contact', type: IntakeContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntakeContactDto)
  secondaryContact?: IntakeContactDto;

  @ApiPropertyOptional({ example: 'Please contact after 5pm' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Family acknowledges financial responsibility for services' })
  @IsBoolean()
  financialResponsibilityAcknowledgment!: boolean;

  @ApiPropertyOptional({ example: 'Google Search' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  howDidYouHearAboutUs?: string;
}
