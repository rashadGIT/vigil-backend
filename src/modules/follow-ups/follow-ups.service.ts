import { Injectable } from '@nestjs/common';
import { FollowUpTemplate } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { N8nEvent } from '../n8n/n8n-events.enum';

const OFFSETS: Record<FollowUpTemplate, number> = {
  one_week: 7,
  one_month: 30,
  six_month: 180,
  one_year: 365,
};

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly n8n: N8nService,
    private readonly configService: ConfigService,
  ) {}

  async scheduleForCase(tenantId: string, caseId: string, contactId: string, baseDate = new Date()) {
    const scoped = this.prisma.forTenant(tenantId);
    const templates = Object.keys(OFFSETS) as FollowUpTemplate[];

    const [created, contact, tenant] = await Promise.all([
      Promise.all(
        templates.map((templateType) =>
          scoped.followUp.create({
            data: {
              tenantId,
              caseId,
              contactId,
              templateType,
              scheduledAt: new Date(baseDate.getTime() + OFFSETS[templateType] * 24 * 3600 * 1000),
            },
          }),
        ),
      ),
      scoped.familyContact.findFirst({ where: { id: contactId } }),
      scoped.tenant.findFirst({ where: { id: tenantId } }),
    ]);

    await this.n8n.trigger(N8nEvent.GRIEF_FOLLOWUP_SCHEDULE, {
      tenantId,
      caseId,
      contactId,
      followUpIds: created.map((f) => f.id),
      familyEmail: contact?.email ?? '',
      familyLastName: contact?.name?.split(' ').pop() ?? '',
      funeralHomeName: tenant?.name ?? '',
      sesFromAddress: this.configService.get<string>('SES_FROM_ADDRESS') ?? 'noreply@kelovaapp.com',
    });

    return created;
  }

  findByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).followUp.findMany({
      where: { caseId },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async markAllComplete(tenantId: string, caseId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.forTenant(tenantId).followUp.updateMany({
      where: { caseId, status: 'pending' },
      data: { status: 'sent', sentAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  async markSent(followUpId: string): Promise<void> {
    await this.prisma.followUp.updateMany({
      where: { id: followUpId, status: 'pending' },
      data: { status: 'sent', sentAt: new Date() },
    });
  }
}
