import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token (unused — token is read from cookie)',
    required: false,
    example: 'eyJhbGci...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
