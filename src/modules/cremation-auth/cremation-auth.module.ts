import { Module } from '@nestjs/common';
import { CremationAuthController } from './cremation-auth.controller';
import { CremationAuthService } from './cremation-auth.service';

@Module({
  controllers: [CremationAuthController],
  providers: [CremationAuthService],
  exports: [CremationAuthService],
})
export class CremationAuthModule {}
