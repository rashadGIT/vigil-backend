import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FollowUpsController } from './follow-ups.controller';
import { InternalFollowUpsController } from './internal-follow-ups.controller';
import { FollowUpsService } from './follow-ups.service';

@Module({
  imports: [ConfigModule],
  controllers: [FollowUpsController, InternalFollowUpsController],
  providers: [FollowUpsService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
