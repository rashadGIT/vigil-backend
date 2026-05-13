import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantPortalDto {
  @ApiProperty({ description: 'ID of the family contact to grant portal access', example: 'clx1abc123' })
  @IsString()
  contactId!: string;
}
