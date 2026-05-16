import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'jane.doe@maplefh.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: UserRole, example: 'funeral_director' })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ description: 'Target tenant ID' })
  @IsString()
  tenantId!: string;

  @ApiProperty({
    description: 'Temporary password — user must change on first login',
    example: 'TempPass2024!',
  })
  @IsString()
  @MinLength(12)
  temporaryPassword!: string;
}
