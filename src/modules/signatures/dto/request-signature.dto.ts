import { IsEnum, IsString } from 'class-validator';
import { SignatureDocument } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RequestSignatureDto {
  @ApiProperty({ description: 'ID of the contact who will sign', example: 'con_01hxyz' })
  @IsString()
  contactId!: string;

  @ApiProperty({ description: 'Type of document requiring signature', enum: SignatureDocument, example: 'authorization' })
  @IsEnum(SignatureDocument)
  documentType!: SignatureDocument;

  @ApiProperty({ description: 'Full name of the signer as it should appear on the document', example: 'James Williams' })
  @IsString()
  signerName!: string;
}
