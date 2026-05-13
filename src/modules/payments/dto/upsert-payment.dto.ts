import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertPaymentDto {
  @ApiProperty({ description: 'Total amount owed for the services in cents or dollars', example: 8500 })
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @ApiProperty({ description: 'Amount already paid', example: 2500 })
  @IsNumber()
  @Min(0)
  amountPaid!: number;

  @ApiProperty({ description: 'Payment method used', example: 'insurance' })
  @IsString()
  method!: string;

  @ApiProperty({ description: 'Additional notes about the payment arrangement', example: 'Life insurance policy #LI-9921', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
