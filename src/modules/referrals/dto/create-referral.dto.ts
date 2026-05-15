import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReferralDto {
  @ApiProperty({
    description: 'Referral source (e.g. hospice, hospital, google)',
    example: 'hospice',
  })
  @IsString()
  source!: string;

  @ApiProperty({
    description: 'Additional notes about the referral',
    example: "Referred by Dr. Adams at St. Luke's",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
