import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class InviteUserDto {
  @ApiProperty({ example: 'sarah.jones@maplefh.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Sarah Jones' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: UserRole, example: 'staff' })
  @IsEnum(UserRole)
  role!: UserRole;
}
