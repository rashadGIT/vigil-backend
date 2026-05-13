import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CaseStatus } from '@prisma/client';
import { CreateCaseDto } from './create-case.dto';

export class UpdateCaseDto extends PartialType(CreateCaseDto) {
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;
}
