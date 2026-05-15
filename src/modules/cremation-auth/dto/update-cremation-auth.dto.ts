import { PartialType } from '@nestjs/swagger';
import { CreateCremationAuthDto } from './create-cremation-auth.dto';

export class UpdateCremationAuthDto extends PartialType(
  CreateCremationAuthDto,
) {}
