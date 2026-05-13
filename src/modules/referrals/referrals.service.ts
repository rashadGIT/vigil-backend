import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReferralDto } from './dto/create-referral.dto';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, caseId: string, dto: CreateReferralDto) {
    return this.prisma.forTenant(tenantId).referralSource.create({
      data: { ...dto, tenantId, caseId },
    });
  }

  findByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).referralSource.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.forTenant(tenantId).referralSource.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Referral ${id} not found`);
    return this.prisma.forTenant(tenantId).referralSource.delete({ where: { id } });
  }
}
