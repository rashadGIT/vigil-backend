import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Staff user email address', example: 'director@maplefh.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Account password (min 8 characters)', example: 'S3cur3Pass!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
