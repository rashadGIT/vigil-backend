import { Module } from '@nestjs/common';
import { FirstCallController } from './first-call.controller';
import { FirstCallService } from './first-call.service';

@Module({
  controllers: [FirstCallController],
  providers: [FirstCallService],
  exports: [FirstCallService],
})
export class FirstCallModule {}
