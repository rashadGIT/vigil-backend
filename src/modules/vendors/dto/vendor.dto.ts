import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { VendorType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertVendorDto {
  @ApiProperty({
    description: 'Vendor business name',
    example: 'City Cremation Services',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Type of vendor',
    enum: VendorType,
    example: 'crematory',
  })
  @IsEnum(VendorType)
  type!: VendorType;

  @ApiProperty({
    description: 'Name of the primary contact at the vendor',
    example: 'Linda Park',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({
    description: 'Vendor contact email',
    example: 'linda@citycremation.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Vendor contact phone number',
    example: '+15135559876',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssignVendorDto {
  @ApiProperty({
    description: 'ID of the vendor to assign to the case',
    example: 'ven_01hxyz',
  })
  @IsString()
  vendorId!: string;

  @ApiProperty({
    description: 'Role the vendor plays in this case',
    example: 'crematory',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;
}
