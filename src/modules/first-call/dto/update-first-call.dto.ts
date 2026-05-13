import { PartialType } from '@nestjs/swagger';
import { CreateFirstCallDto } from './create-first-call.dto';

export class UpdateFirstCallDto extends PartialType(CreateFirstCallDto) {}
