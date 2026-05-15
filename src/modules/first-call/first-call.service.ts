import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFirstCallDto } from './dto/create-first-call.dto';
import { UpdateFirstCallDto } from './dto/update-first-call.dto';

@Injectable()
export class FirstCallService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, caseId: string, dto: CreateFirstCallDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.firstCall.findUnique({ where: { caseId } });
    if (existing) {
      throw new ConflictException(
        `First call record already exists for case ${caseId}`,
      );
    }
    return scoped.firstCall.create({
      data: {
        ...dto,
        calledAt: new Date(dto.calledAt),
        removalAt: dto.removalAt ? new Date(dto.removalAt) : undefined,
        tenantId,
        caseId,
      },
    });
  }

  async findByCase(tenantId: string, caseId: string) {
    const record = await this.prisma.forTenant(tenantId).firstCall.findUnique({
      where: { caseId },
    });
    if (!record)
      throw new NotFoundException(
        `No first call record found for case ${caseId}`,
      );
    return record;
  }

  async update(tenantId: string, caseId: string, dto: UpdateFirstCallDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.firstCall.findUnique({ where: { caseId } });
    if (!existing)
      throw new NotFoundException(
        `No first call record found for case ${caseId}`,
      );
    return scoped.firstCall.update({
      where: { id: existing.id },
      data: {
        ...dto,
        calledAt: dto.calledAt ? new Date(dto.calledAt) : undefined,
        removalAt: dto.removalAt ? new Date(dto.removalAt) : undefined,
      },
    });
  }
}
