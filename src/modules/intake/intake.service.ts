import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { N8nEvent } from '../n8n/n8n-events.enum';
import { TaskTemplatesService } from '../tasks/task-templates.service';
import { IntakeFormDto } from './dto/intake-form.dto';

@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8n: N8nService,
    private readonly taskTemplates: TaskTemplatesService,
  ) {}

  async submit(
    tenantSlug: string,
    dto: IntakeFormDto,
  ): Promise<{ caseId: string; familyAccessToken: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, active: true },
    });
    if (!tenant || !tenant.active) {
      throw new NotFoundException(`No active tenant for slug "${tenantSlug}"`);
    }
    const tenantId = tenant.id;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Case with expanded intake fields
      const createdCase = await tx.case.create({
        data: {
          tenantId,
          deceasedName: dto.deceasedName,
          deceasedDob: dto.deceasedDob ? new Date(dto.deceasedDob) : null,
          deceasedDod: dto.deceasedDod ? new Date(dto.deceasedDod) : null,
          serviceType: dto.serviceType,
          veteranStatus: dto.veteranStatus ?? false,
          placeOfDeath: dto.placeOfDeath ?? null,
          causeOfDeath: dto.causeOfDeath ?? null,
          financialAckAt: dto.financialResponsibilityAcknowledgment
            ? new Date()
            : null,
          howHeard: dto.howDidYouHearAboutUs ?? null,
        },
      });

      // 2. Create primary FamilyContact
      const primaryContact = await tx.familyContact.create({
        data: {
          tenantId,
          caseId: createdCase.id,
          name: dto.primaryContact.name,
          relationship: dto.primaryContact.relationship,
          email: dto.primaryContact.email ?? null,
          phone: dto.primaryContact.phone ?? null,
          addressLine1: dto.primaryContact.addressLine1 ?? null,
          city: dto.primaryContact.city ?? null,
          state: dto.primaryContact.state ?? null,
          zip: dto.primaryContact.zip ?? null,
          isFinanciallyResponsible:
            dto.primaryContact.isFinanciallyResponsible ?? true,
          isPrimaryContact: true,
        },
      });

      // 3. Optional secondary contact
      if (dto.secondaryContact) {
        await tx.familyContact.create({
          data: {
            tenantId,
            caseId: createdCase.id,
            name: dto.secondaryContact.name,
            relationship: dto.secondaryContact.relationship,
            email: dto.secondaryContact.email ?? null,
            phone: dto.secondaryContact.phone ?? null,
            addressLine1: dto.secondaryContact.addressLine1 ?? null,
            city: dto.secondaryContact.city ?? null,
            state: dto.secondaryContact.state ?? null,
            zip: dto.secondaryContact.zip ?? null,
            isFinanciallyResponsible:
              dto.secondaryContact.isFinanciallyResponsible ?? false,
            isPrimaryContact: false,
          },
        });
      }

      // 4. Bulk-create Tasks from service-type template
      const templateTasks = this.taskTemplates.buildTasksForCase(
        tenantId,
        createdCase.id,
        dto.serviceType,
      );
      await tx.task.createMany({ data: templateTasks });

      // 5. CalendarEvent placeholder
      const now = new Date();
      await tx.calendarEvent.create({
        data: {
          tenantId,
          caseId: createdCase.id,
          title: `${dto.serviceType.toUpperCase()} — ${dto.deceasedName}`,
          eventType: EventType.service,
          startTime: now,
          endTime: new Date(now.getTime() + 60 * 60 * 1000),
          notes: 'Placeholder — confirm date/time with family',
        },
      });

      // 6. Generate FamilyPortalAccess token for the primary contact (30-day TTL)
      const familyAccessToken = randomUUID();
      await tx.familyPortalAccess.create({
        data: {
          tenantId,
          caseId: createdCase.id,
          contactId: primaryContact.id,
          accessToken: familyAccessToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        },
      });

      return { caseId: createdCase.id, familyAccessToken };
    });

    this.logger.log(
      `[INTAKE] Submitted for tenant=${tenantId} case=${result.caseId}`,
    );
    void this.n8n.trigger(N8nEvent.INTAKE_NOTIFY, {
      tenantId,
      caseId: result.caseId,
      deceasedName: dto.deceasedName,
      staffEmail: 'staff@kelovaapp.com',
      caseUrl: `https://app.kelovaapp.com/cases/${result.caseId}`,
      sesFromAddress: 'noreply@kelovaapp.com',
    });

    return result;
  }
}
