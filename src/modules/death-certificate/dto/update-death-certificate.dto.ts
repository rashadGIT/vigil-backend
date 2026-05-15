import { PartialType } from '@nestjs/swagger';
import { CreateDeathCertificateDto } from './create-death-certificate.dto';

export class UpdateDeathCertificateDto extends PartialType(
  CreateDeathCertificateDto,
) {}
