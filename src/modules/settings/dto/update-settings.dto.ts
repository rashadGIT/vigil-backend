import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({ description: 'Display name of the funeral home', example: 'Maple Funeral Home', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ description: 'Google review link sent to families 14 days post-service', example: 'https://g.page/r/abc123/review', required: false })
  @IsOptional()
  @IsUrl()
  googleReviewUrl?: string;
}
