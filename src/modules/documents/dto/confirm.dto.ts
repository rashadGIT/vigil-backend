import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmDto {
  @ApiProperty({ description: 'ID of the document record to mark as uploaded', example: 'doc_01hxyz' })
  @IsString()
  documentId!: string;
}
