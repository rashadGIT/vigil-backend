import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateMemorialDto {
  @ApiProperty({
    description: 'Photo URLs for the memorial page',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiProperty({
    description: 'Whether the memorial page is publicly visible',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateMemorialDto extends PartialType(CreateMemorialDto) {}

export class GuestbookEntryDto {
  @ApiProperty({
    description: 'Name of the guestbook visitor',
    example: 'Jane Smith',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Message left by the visitor',
    example: 'He will be deeply missed.',
  })
  @IsString()
  message!: string;
}
