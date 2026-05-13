import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: 'Full name of the contact', example: 'James Williams' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ description: 'Relationship to the deceased', example: 'Son' })
  @IsString()
  @MaxLength(80)
  relationship!: string;

  @ApiProperty({ description: 'Contact email address', example: 'james.williams@email.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Contact phone number', example: '+15135551234', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Whether this contact is the primary next-of-kin', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;
}
