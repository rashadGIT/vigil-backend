import { Injectable } from '@nestjs/common';
import { ServiceType } from '@prisma/client';

export interface TaskTemplateItem {
  title: string;
  defaultDueDays: number | null;
}

export const BURIAL: TaskTemplateItem[] = [
  {
    title: 'Initial family call — document service preferences',
    defaultDueDays: 0,
  },
  { title: 'Transfer remains to funeral home', defaultDueDays: 0 },
  {
    title: 'Obtain death certificate (original + certified copies)',
    defaultDueDays: 1,
  },
  { title: 'File death certificate with county clerk', defaultDueDays: 2 },
  { title: 'Obtain burial permit', defaultDueDays: 2 },
  { title: 'Embalming / body preparation', defaultDueDays: 1 },
  { title: 'Casket selection with family', defaultDueDays: 1 },
  { title: 'Confirm cemetery plot / grave opening', defaultDueDays: 2 },
  {
    title: 'Schedule graveside or chapel service date/time',
    defaultDueDays: 2,
  },
  { title: 'Confirm officiating clergy or celebrant', defaultDueDays: 2 },
  {
    title: 'Arrange pallbearers (confirm names and contact info)',
    defaultDueDays: 3,
  },
  { title: 'Confirm floral arrangements with florist', defaultDueDays: 3 },
  { title: 'Confirm hearse and family car scheduling', defaultDueDays: 3 },
  { title: 'Prepare and submit obituary to newspaper', defaultDueDays: 2 },
  { title: 'Prepare service program / memorial booklet', defaultDueDays: 3 },
  {
    title: 'Coordinate reception / gathering (if applicable)',
    defaultDueDays: 4,
  },
  { title: 'Generate and review FTC General Price List', defaultDueDays: 1 },
  {
    title: 'Obtain signed authorization and service contract',
    defaultDueDays: 1,
  },
];

export const CREMATION: TaskTemplateItem[] = [
  {
    title: 'Initial family call — document service preferences',
    defaultDueDays: 0,
  },
  { title: 'Transfer remains to funeral home', defaultDueDays: 0 },
  {
    title: 'Obtain death certificate (original + certified copies)',
    defaultDueDays: 1,
  },
  { title: 'File death certificate with county clerk', defaultDueDays: 2 },
  { title: 'Obtain cremation permit', defaultDueDays: 2 },
  {
    title:
      'Obtain signed cremation authorization form (REQUIRED — separate from service contract)',
    defaultDueDays: 1,
  },
  { title: 'Schedule cremation with crematory', defaultDueDays: 2 },
  { title: 'Urn selection with family', defaultDueDays: 2 },
  {
    title:
      'Confirm disposition of cremated remains (burial, scattering, kept by family)',
    defaultDueDays: 3,
  },
  {
    title: 'Schedule memorial or celebration of life service (if applicable)',
    defaultDueDays: 3,
  },
  {
    title: 'Confirm officiating clergy or celebrant (if service)',
    defaultDueDays: 3,
  },
  { title: 'Arrange floral arrangements (if service)', defaultDueDays: 4 },
  { title: 'Prepare and submit obituary to newspaper', defaultDueDays: 2 },
  { title: 'Generate and review FTC General Price List', defaultDueDays: 1 },
  {
    title: 'Obtain signed service contract and payment agreement',
    defaultDueDays: 1,
  },
];

export const GRAVESIDE: TaskTemplateItem[] = [
  {
    title: 'Initial family call — document service preferences',
    defaultDueDays: 0,
  },
  { title: 'Transfer remains to funeral home', defaultDueDays: 0 },
  {
    title: 'Obtain death certificate (original + certified copies)',
    defaultDueDays: 1,
  },
  { title: 'File death certificate with county clerk', defaultDueDays: 2 },
  { title: 'Obtain burial permit', defaultDueDays: 2 },
  { title: 'Embalming / body preparation', defaultDueDays: 1 },
  { title: 'Casket selection with family', defaultDueDays: 1 },
  {
    title: 'Confirm cemetery plot and grave opening date/time',
    defaultDueDays: 2,
  },
  { title: 'Confirm officiating clergy or celebrant', defaultDueDays: 2 },
  { title: 'Confirm floral arrangements', defaultDueDays: 3 },
  { title: 'Prepare and submit obituary to newspaper', defaultDueDays: 2 },
  {
    title: 'Generate FTC General Price List + obtain signed authorization',
    defaultDueDays: 1,
  },
];

const MEMORIAL: TaskTemplateItem[] = [
  {
    title: 'Initial family call — document service preferences',
    defaultDueDays: 0,
  },
  {
    title: 'Confirm remains have been handled (cremation or burial prior)',
    defaultDueDays: 1,
  },
  { title: 'Reserve chapel or off-site venue for memorial', defaultDueDays: 2 },
  { title: 'Schedule memorial service date and time', defaultDueDays: 2 },
  {
    title: 'Confirm officiating clergy, celebrant, or family speaker',
    defaultDueDays: 3,
  },
  {
    title:
      'Arrange audio/visual for photo tribute (collect photos from family)',
    defaultDueDays: 3,
  },
  { title: 'Arrange floral arrangements or decorations', defaultDueDays: 4 },
  { title: 'Prepare memorial program / printed materials', defaultDueDays: 4 },
  {
    title: 'Coordinate reception after service (if applicable)',
    defaultDueDays: 4,
  },
  {
    title: 'Generate invoice and obtain signed payment agreement',
    defaultDueDays: 1,
  },
];

const TEMPLATES: Record<ServiceType, TaskTemplateItem[]> = {
  burial: BURIAL,
  cremation: CREMATION,
  graveside: GRAVESIDE,
  memorial: MEMORIAL,
};

@Injectable()
export class TaskTemplatesService {
  getTemplate(serviceType: ServiceType): TaskTemplateItem[] {
    return TEMPLATES[serviceType];
  }

  buildTasksForCase(
    tenantId: string,
    caseId: string,
    serviceType: ServiceType,
    baseDate: Date = new Date(),
  ): Array<{
    tenantId: string;
    caseId: string;
    title: string;
    dueDate: Date | null;
  }> {
    return this.getTemplate(serviceType).map((t) => ({
      tenantId,
      caseId,
      title: t.title,
      dueDate:
        t.defaultDueDays === null
          ? null
          : new Date(
              baseDate.getTime() + t.defaultDueDays * 24 * 60 * 60 * 1000,
            ),
    }));
  }
}
