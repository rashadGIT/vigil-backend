import { Module } from '@nestjs/common';
import {
  MerchandiseController,
  CaseMerchandiseController,
} from './merchandise.controller';
import { MerchandiseService } from './merchandise.service';

@Module({
  controllers: [MerchandiseController, CaseMerchandiseController],
  providers: [MerchandiseService],
  exports: [MerchandiseService],
})
export class MerchandiseModule {}
