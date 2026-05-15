import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ObituariesService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: string, caseId: string) {
    const scoped = this.prisma.forTenant(tenantId);
    const kase = await scoped.case.findFirst({
      where: { id: caseId },
      include: { familyContacts: { where: { isPrimaryContact: true } } },
    });
    if (!kase) throw new NotFoundException(`Case ${caseId} not found`);

    const primary = kase.familyContacts[0];
    const age =
      kase.deceasedDob && kase.deceasedDod
        ? Math.floor(
            (kase.deceasedDod.getTime() - kase.deceasedDob.getTime()) /
              (365.25 * 24 * 3600 * 1000),
          )
        : null;
    const firstName = kase.deceasedName.split(' ')[0];
    const text =
      `${kase.deceasedName}${age ? `, ${age}, ` : ', '}passed away on ${kase.deceasedDod?.toDateString() ?? 'a date to be announced'}. ` +
      `Born on ${kase.deceasedDob?.toDateString() ?? 'a date to be announced'}, ${firstName} is survived by ` +
      `${primary ? `${primary.name} (${primary.relationship})` : 'loving family'} and loving family and friends. ` +
      `A ${kase.serviceType} service will be held at a date and time to be announced. ` +
      `In lieu of flowers, the family requests donations to a charity of your choice.`;

    return scoped.obituary.upsert({
      where: { caseId },
      create: { tenantId, caseId, draftText: text, status: 'draft' },
      update: { draftText: text },
    });
  }

  async findByCase(tenantId: string, caseId: string) {
    const ob = await this.prisma
      .forTenant(tenantId)
      .obituary.findFirst({ where: { caseId } });
    if (!ob) throw new NotFoundException(`No obituary for case ${caseId}`);
    return ob;
  }

  async update(
    tenantId: string,
    caseId: string,
    draftText: string,
    status?: string,
  ) {
    return this.prisma.forTenant(tenantId).obituary.update({
      where: { caseId },
      data: { draftText, ...(status ? { status } : {}) },
    });
  }
}
