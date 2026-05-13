import { Module } from '@nestjs/common';
import { CronStubsService } from './cron-stubs.service';

@Module({
  providers: [CronStubsService],
})
export class CronModule {}
