import { PartialType } from '@nestjs/swagger';
import { CreateMerchandiseItemDto } from './create-merchandise-item.dto';

export class UpdateMerchandiseItemDto extends PartialType(
  CreateMerchandiseItemDto,
) {}
