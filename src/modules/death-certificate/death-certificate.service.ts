import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDeathCertificateDto } from './dto/create-death-certificate.dto';
import { UpdateDeathCertificateDto } from './dto/update-death-certificate.dto';

@Injectable()
export class DeathCertificateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, caseId: string, dto: CreateDeathCertificateDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.deathCertificate.findUnique({ where: { caseId } });
    if (existing) {
      throw new ConflictException(`Death certificate already exists for case ${caseId}`);
    }
    return scoped.deathCertificate.create({
      data: {
        ...dto,
        dateOfDeath: new Date(dto.dateOfDeath),
        edrsFiledAt: dto.edrsFiledAt ? new Date(dto.edrsFiledAt) : undefined,
        stateFiledAt: dto.stateFiledAt ? new Date(dto.stateFiledAt) : undefined,
        physicianSignedAt: dto.physicianSignedAt ? new Date(dto.physicianSignedAt) : undefined,
        tenantId,
        caseId,
      },
    });
  }

  async findByCase(tenantId: string, caseId: string) {
    const cert = await this.prisma.forTenant(tenantId).deathCertificate.findUnique({
      where: { caseId },
    });
    if (!cert) throw new NotFoundException(`No death certificate found for case ${caseId}`);
    return cert;
  }

  async update(tenantId: string, caseId: string, dto: UpdateDeathCertificateDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.deathCertificate.findUnique({ where: { caseId } });
    if (!existing) throw new NotFoundException(`No death certificate found for case ${caseId}`);
    return scoped.deathCertificate.update({
      where: { id: existing.id },
      data: {
        ...dto,
        dateOfDeath: dto.dateOfDeath ? new Date(dto.dateOfDeath) : undefined,
        edrsFiledAt: dto.edrsFiledAt ? new Date(dto.edrsFiledAt) : undefined,
        stateFiledAt: dto.stateFiledAt ? new Date(dto.stateFiledAt) : undefined,
        physicianSignedAt: dto.physicianSignedAt ? new Date(dto.physicianSignedAt) : undefined,
      },
    });
  }
}
