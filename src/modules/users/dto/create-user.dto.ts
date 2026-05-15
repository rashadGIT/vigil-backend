import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email address for the new staff user',
    example: 'sarah.jones@maplefh.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Full display name of the staff member',
    example: 'Sarah Jones',
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    description: 'Role determining permissions within the tenant',
    enum: UserRole,
    example: 'staff',
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({
    description:
      'Temporary password (min 12 chars) — user must change on first login',
    example: 'TempPass2024!',
  })
  @IsString()
  @MinLength(12)
  temporaryPassword!: string;
}
