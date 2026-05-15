import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertPaymentDto } from './dto/upsert-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(tenantId: string, caseId: string, dto: UpsertPaymentDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const existing = await scoped.payment.findFirst({ where: { caseId } });
    if (existing) {
      return scoped.payment.update({ where: { id: existing.id }, data: dto });
    }
    return scoped.payment.create({ data: { ...dto, tenantId, caseId } });
  }

  async findByCase(tenantId: string, caseId: string) {
    const payment = await this.prisma
      .forTenant(tenantId)
      .payment.findFirst({ where: { caseId } });
    if (!payment) throw new NotFoundException(`No payment for case ${caseId}`);
    const outstanding =
      Number(payment.totalAmount) - Number(payment.amountPaid);
    return { ...payment, outstanding };
  }
}
