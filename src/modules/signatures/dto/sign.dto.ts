import { IsBoolean, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignDto {
  @ApiProperty({ description: 'Confirms the signer has reviewed and intends to sign', example: true })
  @IsBoolean()
  intentConfirmed!: boolean;

  @ApiProperty({ description: 'Base64-encoded PNG of the drawn signature from the canvas', example: 'data:image/png;base64,iVBORw0KGgo...' })
  @IsString()
  @MinLength(10)
  signatureData!: string; // base64 PNG from canvas
}
