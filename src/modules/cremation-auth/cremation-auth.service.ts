import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCremationAuthDto } from './dto/create-cremation-auth.dto';
import { UpdateCremationAuthDto } from './dto/update-cremation-auth.dto';

@Injectable()
export class CremationAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, caseId: string, dto: CreateCremationAuthDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.cremationAuthorization.findUnique({ where: { caseId } });
    if (existing) {
      throw new ConflictException(`Cremation authorization already exists for case ${caseId}`);
    }
    return scoped.cremationAuthorization.create({
      data: {
        ...dto,
        authorizedAt: dto.authorizedAt ? new Date(dto.authorizedAt) : undefined,
        tenantId,
        caseId,
      },
    });
  }

  async findByCase(tenantId: string, caseId: string) {
    const record = await this.prisma.forTenant(tenantId).cremationAuthorization.findUnique({
      where: { caseId },
    });
    if (!record) throw new NotFoundException(`No cremation authorization found for case ${caseId}`);
    return record;
  }

  async update(tenantId: string, caseId: string, dto: UpdateCremationAuthDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.cremationAuthorization.findUnique({ where: { caseId } });
    if (!existing) throw new NotFoundException(`No cremation authorization found for case ${caseId}`);
    return scoped.cremationAuthorization.update({
      where: { id: existing.id },
      data: {
        ...dto,
        authorizedAt: dto.authorizedAt ? new Date(dto.authorizedAt) : undefined,
      },
    });
  }

  async clearWaitingPeriod(tenantId: string, caseId: string) {
    const scoped = this.prisma.forTenant(tenantId);
    const record = await scoped.cremationAuthorization.findUnique({ where: { caseId } });
    if (!record) throw new NotFoundException(`No cremation authorization found for case ${caseId}`);
    if (!record.authorizedAt) {
      throw new BadRequestException('Authorization has not been obtained yet');
    }
    const clearTime =
      record.authorizedAt.getTime() + record.waitingPeriodHours * 3_600_000;
    if (Date.now() < clearTime) {
      throw new BadRequestException('Waiting period not yet elapsed');
    }
    return scoped.cremationAuthorization.update({
      where: { id: record.id },
      data: {
        cremationClearedAt: new Date(),
        status: 'cleared',
      },
    });
  }

  async markPerformed(tenantId: string, caseId: string) {
    const scoped = this.prisma.forTenant(tenantId);
    const record = await scoped.cremationAuthorization.findUnique({ where: { caseId } });
    if (!record) throw new NotFoundException(`No cremation authorization found for case ${caseId}`);
    if (!record.cremationClearedAt) {
      throw new BadRequestException(
        'Waiting period must be cleared before marking cremation as performed',
      );
    }
    return scoped.cremationAuthorization.update({
      where: { id: record.id },
      data: {
        cremationPerformedAt: new Date(),
        status: 'performed',
      },
    });
  }
}
