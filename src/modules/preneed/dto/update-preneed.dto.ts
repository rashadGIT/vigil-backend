import { PartialType } from '@nestjs/swagger';
import { CreatePreneedDto } from './create-preneed.dto';

export class UpdatePreneedDto extends PartialType(CreatePreneedDto) {}
