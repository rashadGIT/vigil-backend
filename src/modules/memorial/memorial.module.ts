import { Module } from '@nestjs/common';
import { MemorialController } from './memorial.controller';
import { MemorialService } from './memorial.service';

@Module({
  controllers: [MemorialController],
  providers: [MemorialService],
  exports: [MemorialService],
})
export class MemorialModule {}
