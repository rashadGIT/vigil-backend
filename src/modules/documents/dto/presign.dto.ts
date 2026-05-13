import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { DocumentType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class PresignDto {
  @ApiProperty({ description: 'Original file name for the upload', example: 'death-certificate.pdf' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ description: 'MIME type of the file', example: 'application/pdf' })
  @IsString()
  contentType!: string;

  @ApiProperty({ description: 'Category of document being uploaded', enum: DocumentType, example: 'death_cert' })
  @IsEnum(DocumentType)
  documentType!: DocumentType;
}
