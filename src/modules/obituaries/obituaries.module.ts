import { Module } from '@nestjs/common';
import { ObituariesController } from './obituaries.controller';
import { ObituariesService } from './obituaries.service';

@Module({
  controllers: [ObituariesController],
  providers: [ObituariesService],
  exports: [ObituariesService],
})
export class ObituariesModule {}
