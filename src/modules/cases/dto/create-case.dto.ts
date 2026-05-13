import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ServiceType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCaseDto {
  @ApiProperty({ description: 'Full legal name of the deceased', example: 'Margaret Anne Williams' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  deceasedName!: string;

  @ApiProperty({ description: 'Date of birth of the deceased (ISO 8601)', example: '1942-03-15', required: false })
  @IsOptional()
  @IsDateString()
  deceasedDob?: string;

  @ApiProperty({ description: 'Date of death (ISO 8601)', example: '2024-11-20', required: false })
  @IsOptional()
  @IsDateString()
  deceasedDod?: string;

  @ApiProperty({ description: 'Type of funeral service', enum: ServiceType, example: 'burial' })
  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @ApiProperty({ description: 'User ID of the staff member assigned to this case', example: 'usr_01hxyz', required: false })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiProperty({ description: 'Religious or cultural tradition for the service', example: 'Catholic', required: false })
  @IsOptional()
  @IsString()
  faithTradition?: string;
}
