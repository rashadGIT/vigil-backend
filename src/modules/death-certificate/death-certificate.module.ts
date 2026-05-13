import { Module } from '@nestjs/common';
import { DeathCertificateController } from './death-certificate.controller';
import { DeathCertificateService } from './death-certificate.service';

@Module({
  controllers: [DeathCertificateController],
  providers: [DeathCertificateService],
  exports: [DeathCertificateService],
})
export class DeathCertificateModule {}
