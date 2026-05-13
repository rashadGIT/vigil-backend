import { Module } from '@nestjs/common';
import { PreneedController } from './preneed.controller';
import { PreneedService } from './preneed.service';

@Module({
  controllers: [PreneedController],
  providers: [PreneedService],
  exports: [PreneedService],
})
export class PreneedModule {}
