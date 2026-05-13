import { Module } from '@nestjs/common';
import { CemeteryController } from './cemetery.controller';
import { CemeteryService } from './cemetery.service';

@Module({
  controllers: [CemeteryController],
  providers: [CemeteryService],
  exports: [CemeteryService],
})
export class CemeteryModule {}
