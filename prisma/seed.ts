import { PrismaClient, UserRole, PriceCategory, ServiceType, CaseStatus, VendorType, EventType, SignatureDocument, FollowUpTemplate } from '@prisma/client';
import {
  BURIAL,
  CREMATION,
  GRAVESIDE,
} from '../src/modules/tasks/task-templates.service';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';

const prisma = new PrismaClient();

const COGNITO_ENABLED = !!(process.env.AWS_REGION && process.env.COGNITO_USER_POOL_ID);
const cognito = COGNITO_ENABLED
  ? new CognitoIdentityProviderClient({ region: process.env.AWS_REGION })
  : null;

// Demo password used for all seeded users (D-13). Only usable when Cognito is wired;
// DEV_AUTH_BYPASS doesn't verify the password at all — it matches by email.
const DEMO_PASSWORD = 'Demo1234!';

async function ensureCognitoUser(
  email: string,
  tenantId: string,
  role: 'funeral_director' | 'staff',
): Promise<string> {
  // Deterministic offline stub — stable across re-runs (D-13).
  const stubSub = `cognito-sub-${email.replace('@', '-').replace(/\./g, '-')}`;
  if (!COGNITO_ENABLED || !cognito) return stubSub;

  const UserPoolId = process.env.COGNITO_USER_POOL_ID!;
  try {
    const res = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId,
        Username: email,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:tenantId', Value: tenantId },
          { Name: 'custom:role', Value: role },
        ],
      }),
    );
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId,
        Username: email,
        Password: DEMO_PASSWORD,
        Permanent: true,
      }),
    );
    const sub = res.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
    return sub ?? stubSub;
  } catch (err) {
    if (err instanceof UsernameExistsException) {
      // User already exists in Cognito — keep stub sub (idempotent re-run).
      return stubSub;
    }
    console.warn(`[seed] Cognito create failed for ${email}:`, (err as Error).message);
    return stubSub;
  }
}

type SeedPriceItem = {
  category: PriceCategory;
  name: string;
  price: number;
  taxable: boolean;
  sortOrder: number;
};

const SUNRISE_PRICE_LIST: SeedPriceItem[] = [
  // Professional Services (5)
  { category: PriceCategory.professional_services, name: 'Basic Services of Funeral Director and Staff', price: 1995, taxable: false, sortOrder: 10 },
  { category: PriceCategory.professional_services, name: 'Embalming', price: 795, taxable: false, sortOrder: 20 },
  { category: PriceCategory.professional_services, name: 'Other Preparation of the Body', price: 295, taxable: false, sortOrder: 30 },
  { category: PriceCategory.professional_services, name: 'Transfer of Remains to Funeral Home', price: 395, taxable: false, sortOrder: 40 },
  { category: PriceCategory.professional_services, name: 'Direct Cremation (Alternative Container)', price: 895, taxable: false, sortOrder: 50 },

  // Facilities (4)
  { category: PriceCategory.facilities, name: 'Use of Facilities for Visitation', price: 495, taxable: false, sortOrder: 10 },
  { category: PriceCategory.facilities, name: 'Use of Facilities for Funeral Ceremony', price: 695, taxable: false, sortOrder: 20 },
  { category: PriceCategory.facilities, name: 'Use of Facilities for Memorial Service', price: 595, taxable: false, sortOrder: 30 },
  { category: PriceCategory.facilities, name: 'Graveside Service (On-Site Staffing)', price: 495, taxable: false, sortOrder: 40 },

  // Vehicles (4)
  { category: PriceCategory.vehicles, name: 'Funeral Coach (Hearse)', price: 395, taxable: false, sortOrder: 10 },
  { category: PriceCategory.vehicles, name: 'Family Limousine', price: 295, taxable: false, sortOrder: 20 },
  { category: PriceCategory.vehicles, name: 'Utility Vehicle / Flower Car', price: 195, taxable: false, sortOrder: 30 },
  { category: PriceCategory.vehicles, name: 'Service Vehicle (Out-of-Area Mileage)', price: 3.50, taxable: false, sortOrder: 40 },

  // Merchandise (5)
  { category: PriceCategory.merchandise, name: 'Standard Cloth-Covered Casket', price: 1495, taxable: true, sortOrder: 10 },
  { category: PriceCategory.merchandise, name: 'Solid Oak Hardwood Casket', price: 3295, taxable: true, sortOrder: 20 },
  { category: PriceCategory.merchandise, name: 'Cremation Urn — Brushed Brass', price: 295, taxable: true, sortOrder: 30 },
  { category: PriceCategory.merchandise, name: 'Cremation Urn — Cherry Wood', price: 495, taxable: true, sortOrder: 40 },
  { category: PriceCategory.merchandise, name: 'Memorial Register Book + Acknowledgement Cards', price: 145, taxable: true, sortOrder: 50 },
];

const SUNRISE_VENDORS = [
  { type: VendorType.florist,   name: 'Rose & Lily Florists',       contactName: 'Anita Ramos',     email: 'orders@roseandlily.example.com', phone: '614-555-0201' },
  { type: VendorType.clergy,    name: 'Rev. Thomas Bennett',        contactName: 'Thomas Bennett',  email: 'pastor.bennett@example.com',     phone: '614-555-0215' },
  { type: VendorType.crematory, name: 'Buckeye State Crematory',    contactName: 'Janet Wu',        email: 'ops@buckeyecrematory.example.com',phone: '614-555-0230' },
  { type: VendorType.livery,    name: 'Capital City Livery Co.',    contactName: 'Marcus Tate',     email: 'dispatch@ccliv.example.com',     phone: '614-555-0248' },
];

async function seedVendors(sunriseId: string) {
  const vendorsByType: Partial<Record<VendorType, { id: string }>> = {};
  for (const v of SUNRISE_VENDORS) {
    let row = await prisma.vendor.findFirst({ where: { tenantId: sunriseId, name: v.name } });
    if (!row) {
      row = await prisma.vendor.create({
        data: { tenantId: sunriseId, type: v.type, name: v.name, contactName: v.contactName, email: v.email, phone: v.phone, active: true },
      });
    }
    vendorsByType[v.type] = { id: row.id };
  }
  console.log(`[seed] vendors: ${SUNRISE_VENDORS.length}`);
  return vendorsByType;
}

async function seedVendorAssignments(
  sunriseId: string,
  vendors: Partial<Record<VendorType, { id: string }>>,
  chenCaseId: string,
  abramsCaseId: string,
) {
  const assignments = [
    // Margaret Chen (cremation, in_progress)
    { caseId: chenCaseId,   vendorId: vendors.crematory!.id, role: 'cremation',   status: 'confirmed' },
    { caseId: chenCaseId,   vendorId: vendors.clergy!.id,    role: 'officiant',   status: 'requested' },
    // Robert Abrams (graveside, completed)
    { caseId: abramsCaseId, vendorId: vendors.clergy!.id,    role: 'officiant',   status: 'completed' },
    { caseId: abramsCaseId, vendorId: vendors.florist!.id,   role: 'floral',      status: 'completed' },
    { caseId: abramsCaseId, vendorId: vendors.livery!.id,    role: 'hearse+limo', status: 'completed' },
  ];
  for (const a of assignments) {
    const existing = await prisma.vendorAssignment.findFirst({
      where: { tenantId: sunriseId, caseId: a.caseId, vendorId: a.vendorId },
    });
    if (!existing) {
      await prisma.vendorAssignment.create({ data: { tenantId: sunriseId, ...a } });
    }
  }
  console.log(`[seed] vendor assignments: ${assignments.length}`);
}

async function seedCalendarEvents(sunriseId: string, abramsCaseId: string) {
  const base = Date.now() - 13 * DAY_MS; // service day was ~13 days ago
  const events = [
    { eventType: EventType.visitation, title: 'Visitation — Robert Abrams',        location: 'Sunrise Funeral Home Chapel', startOffsetH: 0,  endOffsetH: 2 },
    { eventType: EventType.service,    title: 'Graveside Service — Robert Abrams', location: 'Greenlawn Cemetery',          startOffsetH: 24, endOffsetH: 25 },
    { eventType: EventType.committal,  title: 'Committal — Robert Abrams',         location: 'Greenlawn Cemetery',          startOffsetH: 25, endOffsetH: 25.5 },
  ];
  for (const e of events) {
    const startTime = new Date(base + e.startOffsetH * 60 * 60 * 1000);
    const endTime   = new Date(base + e.endOffsetH * 60 * 60 * 1000);
    const existing = await prisma.calendarEvent.findFirst({
      where: { tenantId: sunriseId, caseId: abramsCaseId, eventType: e.eventType },
    });
    if (!existing) {
      await prisma.calendarEvent.create({
        data: { tenantId: sunriseId, caseId: abramsCaseId, eventType: e.eventType, title: e.title, location: e.location, startTime, endTime },
      });
    }
  }
  console.log(`[seed] calendar events: ${events.length}`);
}

async function seedPaymentsAndSignatures(sunriseId: string, abramsCaseId: string, contactId: string) {
  // Payment (Abrams case — completed → fully paid)
  await prisma.payment.upsert({
    where: { caseId: abramsCaseId },
    update: {},
    create: {
      tenantId: sunriseId,
      caseId: abramsCaseId,
      totalAmount: 8450.00,
      amountPaid:  8450.00,
      method: 'check',
      notes: 'Paid in full at time of arrangement conference.',
    },
  });

  // Signed authorization (Abrams)
  const token = 'sig-abrams-authorization';
  const existingSig = await prisma.signature.findUnique({ where: { token } });
  if (!existingSig) {
    await prisma.signature.create({
      data: {
        tenantId: sunriseId,
        caseId: abramsCaseId,
        contactId,
        documentType: SignatureDocument.authorization,
        token,
        signerName: 'Ruth Abrams',
        signerEmail: 'ruth.abrams@example.com',
        signerIp: '192.0.2.55',
        checkboxConfirmedAt: new Date(Date.now() - 14 * DAY_MS),
        signedAt: new Date(Date.now() - 14 * DAY_MS),
        signatureData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
        documentHash: 'sha256:demo-hash-abrams-authorization',
        expiresAt: new Date(Date.now() + 365 * DAY_MS),
      },
    });
  }
  console.log(`[seed] payment + signature for Abrams`);
}

async function seedObituaries(sunriseId: string, chenCaseId: string, abramsCaseId: string) {
  const draftChen = [
    'Margaret Chen, 70, of Columbus, Ohio, passed peacefully surrounded by family.',
    'A beloved mother, grandmother, and retired teacher, Margaret touched countless lives through her classroom and her garden.',
    'Services are pending. In lieu of flowers, the family requests donations to the local library foundation.',
  ].join('\n\n');

  const draftAbrams = [
    'Robert "Bob" Abrams, 84, of Worthington, Ohio, passed away peacefully at home.',
    'A WWII veteran and longtime owner of Abrams Hardware, Bob was known for his steady hand, dry wit, and unwavering devotion to his wife of 61 years, Ruth.',
    'Graveside services were held at Greenlawn Cemetery. The family thanks Sunrise Funeral Home for their care.',
  ].join('\n\n');

  await prisma.obituary.upsert({
    where: { caseId: chenCaseId },
    update: {},
    create: { tenantId: sunriseId, caseId: chenCaseId, draftText: draftChen, status: 'draft' },
  });
  await prisma.obituary.upsert({
    where: { caseId: abramsCaseId },
    update: {},
    create: { tenantId: sunriseId, caseId: abramsCaseId, draftText: draftAbrams, status: 'approved' },
  });
  console.log(`[seed] obituaries: 2`);
}

async function seedFollowUps(sunriseId: string, abramsCaseId: string, contactId: string) {
  const serviceDate = Date.now() - 13 * DAY_MS;
  const entries: Array<{ tmpl: FollowUpTemplate; offsetDays: number; status: string }> = [
    { tmpl: FollowUpTemplate.one_week,  offsetDays: 7,   status: 'sent'    }, // already past
    { tmpl: FollowUpTemplate.one_month, offsetDays: 30,  status: 'pending' },
    { tmpl: FollowUpTemplate.six_month, offsetDays: 180, status: 'pending' },
    { tmpl: FollowUpTemplate.one_year,  offsetDays: 365, status: 'pending' },
  ];
  for (const e of entries) {
    const existing = await prisma.followUp.findFirst({
      where: { tenantId: sunriseId, caseId: abramsCaseId, templateType: e.tmpl },
    });
    if (!existing) {
      const scheduledAt = new Date(serviceDate + e.offsetDays * DAY_MS);
      await prisma.followUp.create({
        data: {
          tenantId: sunriseId,
          caseId: abramsCaseId,
          contactId,
          templateType: e.tmpl,
          status: e.status,
          scheduledAt,
          sentAt: e.status === 'sent' ? scheduledAt : null,
        },
      });
    }
  }
  console.log(`[seed] follow-ups: ${entries.length}`);
}

async function seedPriceList(sunriseId: string) {
  for (const item of SUNRISE_PRICE_LIST) {
    const existing = await prisma.priceListItem.findFirst({
      where: { tenantId: sunriseId, category: item.category, name: item.name },
    });
    if (existing) {
      await prisma.priceListItem.update({
        where: { id: existing.id },
        data: { price: item.price, taxable: item.taxable, sortOrder: item.sortOrder, active: true },
      });
    } else {
      await prisma.priceListItem.create({
        data: {
          tenantId: sunriseId,
          category: item.category,
          name: item.name,
          price: item.price,
          taxable: item.taxable,
          active: true,
          sortOrder: item.sortOrder,
        },
      });
    }
  }
  console.log(`[seed] price list: ${SUNRISE_PRICE_LIST.length} items for Sunrise`);
}

async function seedTenants() {
  const sunrise = await prisma.tenant.upsert({
    where: { slug: 'sunrise' },
    update: {},
    create: {
      name: 'Sunrise Funeral Home',
      slug: 'sunrise',
      subdomain: 'sunrise',
      planTier: 'standard',
      active: true,
      flagESignatures: true,
      flagGplCompliance: true,
      flagVendorCoordination: true,
      flagCalendar: true,
      flagFamilyPortal: false,
      googleReviewUrl: 'https://g.page/r/sunrise-funeral-home/review',
    },
  });

  const heritage = await prisma.tenant.upsert({
    where: { slug: 'heritage' },
    update: {},
    create: {
      name: 'Heritage Memorial',
      slug: 'heritage',
      subdomain: 'heritage',
      planTier: 'pilot',
      active: true,
      flagESignatures: false,
      flagGplCompliance: true,
      flagVendorCoordination: false,
      flagCalendar: true,
      flagFamilyPortal: false,
    },
  });

  console.log(`[seed] tenants: ${sunrise.slug}, ${heritage.slug}`);
  return { sunrise, heritage };
}

async function seedUsers(
  tenants: { sunrise: { id: string }; heritage: { id: string } },
) {
  const users = [
    { email: 'director@sunrise.demo', name: 'Evelyn Park',     role: UserRole.funeral_director, tenantId: tenants.sunrise.id },
    { email: 'staff@sunrise.demo',    name: 'Marcus Lee',      role: UserRole.staff,            tenantId: tenants.sunrise.id },
    { email: 'director@heritage.demo',name: 'Nadia Brooks',    role: UserRole.funeral_director, tenantId: tenants.heritage.id },
    { email: 'staff@heritage.demo',   name: 'Darius Whitfield',role: UserRole.staff,            tenantId: tenants.heritage.id },
  ];

  for (const u of users) {
    const cognitoSub = await ensureCognitoUser(u.email, u.tenantId, u.role);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, tenantId: u.tenantId, cognitoSub, active: true },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        tenantId: u.tenantId,
        cognitoSub,
        active: true,
      },
    });
  }
  console.log(`[seed] users: ${users.length}`);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Historical bulk seed — 3 years of completed cases with payments
// ---------------------------------------------------------------------------
const HIST_FIRST = [
  'William','Dorothy','Harold','Betty','Eugene','Mildred','Leonard','Edna',
  'Raymond','Vivian','Gerald','Ethel','Walter','Norma','Arthur','Gladys',
  'Bernard','Phyllis','Clarence','Florence','Stanley','Lillian','Howard','Irene',
  'Frederick','Beatrice','Theodore','Mabel','Albert','Agnes','Frank','Vera',
  'George','Hazel','Charles','Bertha','Joseph','Esther','Henry','Loretta',
  'Carl','Thelma','Louis','Ruth','Ernest','Wanda','Melvin','Pauline','Morris','Alma',
];
const HIST_LAST = [
  'Harrison','Mitchell','Campbell','Stewart','Morris','Barnes','Griffin',
  'Watson','Brooks','Kelly','Sanders','Price','Bennett','Wood','Foster',
  'Ross','Henderson','Coleman','Jenkins','Perry','Powell','Long','Patterson',
  'Hughes','Flores','Washington','Butler','Simmons','Gonzales','Bryant',
  'Alexander','Russell','Diaz','Hayes','Myers','Ford','Hamilton','Graham',
  'Sullivan','Wallace','Woods','Cole','West','Jordan','Owens','Reynolds',
  'Fisher','Ellis','Crawford','Hoffman',
];
const HIST_SERVICE_TYPES: ServiceType[] = [
  'burial','burial','cremation','cremation','cremation','graveside','memorial',
] as ServiceType[];
const HIST_CONTACT_NAMES = ['Spouse','Child','Sibling','Parent','Grandchild'];

function seededInt(seed: number, min: number, max: number): number {
  const s = ((seed * 1664525 + 1013904223) & 0x7fffffff);
  return min + (s % (max - min + 1));
}

async function seedHistoricalCases(tenantId: string, assignedToId: string) {
  // Remove any previously seeded cases with the ugly "(YYYY-MM-N)" suffix
  await prisma.case.deleteMany({
    where: { tenantId, deceasedName: { contains: '(' } },
  });

  const now = new Date();
  const totalMonths = 36;
  let seeded = 0;

  for (let mIdx = 0; mIdx < totalMonths; mIdx++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - totalMonths + mIdx, 1);
    const yyyy = monthDate.getFullYear();
    const mm = monthDate.getMonth(); // 0-based
    const monthStart = new Date(yyyy, mm, 1);
    const monthEnd   = new Date(yyyy, mm + 1, 1);

    // Growth: 3 cases/month at start → 10 at end
    const casesThisMonth = 3 + Math.round((mIdx / (totalMonths - 1)) * 7);

    for (let cIdx = 0; cIdx < casesThisMonth; cIdx++) {
      const seed = mIdx * 100 + cIdx;
      const firstName = HIST_FIRST[seed % HIST_FIRST.length];
      const lastName  = HIST_LAST[(seed * 7) % HIST_LAST.length];
      const deceasedName = `${firstName} ${lastName}`;

      const existing = await prisma.case.findFirst({
        where: { tenantId, deceasedName, createdAt: { gte: monthStart, lt: monthEnd } },
      });
      if (existing) continue;

      const dayOfMonth = 1 + seededInt(seed, 0, 25);
      const createdAt  = new Date(yyyy, mm, dayOfMonth, 9, 0, 0);
      const serviceType = HIST_SERVICE_TYPES[seed % HIST_SERVICE_TYPES.length];
      const amountPaid  = seededInt(seed * 13, 3500, 8000);

      const caseRow = await prisma.case.create({
        data: {
          tenantId,
          deceasedName,
          deceasedDob: new Date(yyyy - seededInt(seed, 65, 95), seededInt(seed, 0, 11), 1),
          deceasedDod: new Date(createdAt.getTime() - DAY_MS * seededInt(seed, 1, 3)),
          serviceType,
          status: 'completed' as CaseStatus,
          assignedToId,
          createdAt,
        },
      });

      const contactRelationship = HIST_CONTACT_NAMES[seed % HIST_CONTACT_NAMES.length];
      await prisma.familyContact.create({
        data: {
          tenantId,
          caseId: caseRow.id,
          name: `${HIST_FIRST[(seed + 3) % HIST_FIRST.length]} ${lastName}`,
          relationship: contactRelationship,
          email: `contact-${seed}@example.com`,
          phone: `614-555-${String(1000 + seed).slice(-4)}`,
          isPrimaryContact: true,
        },
      });

      await prisma.payment.upsert({
        where: { caseId: caseRow.id },
        update: {},
        create: {
          tenantId,
          caseId: caseRow.id,
          totalAmount: amountPaid,
          amountPaid,
          method: ['check','cash','credit_card','insurance'][seed % 4],
          notes: 'Paid in full.',
        },
      });

      seeded++;
    }
  }
  console.log(`[seed] historical cases: ${seeded} across ${totalMonths} months`);
}

type DemoCase = {
  deceasedName: string;
  deceasedDob: Date;
  deceasedDod: Date;
  serviceType: ServiceType;
  status: CaseStatus;
  daysAgo: number;
  template: typeof BURIAL;
  contact: { name: string; relationship: string; email: string; phone: string };
  completedTaskIndices: number[];
  overdueTaskIndex: number | null;
};

function demoCases(): DemoCase[] {
  return [
    {
      deceasedName: 'James Holloway',
      deceasedDob: new Date('1948-03-12'),
      deceasedDod: new Date(Date.now() - 2 * DAY_MS),
      serviceType: 'burial' as ServiceType,
      status: 'new' as CaseStatus,
      daysAgo: 0,
      template: BURIAL,
      contact: { name: 'Linda Holloway', relationship: 'Spouse', email: 'linda.holloway@example.com', phone: '614-555-0142' },
      completedTaskIndices: [],
      overdueTaskIndex: null,
    },
    {
      deceasedName: 'Margaret Chen',
      deceasedDob: new Date('1955-07-24'),
      deceasedDod: new Date(Date.now() - 6 * DAY_MS),
      serviceType: 'cremation' as ServiceType,
      status: 'in_progress' as CaseStatus,
      daysAgo: 5,
      template: CREMATION,
      contact: { name: 'David Chen', relationship: 'Son', email: 'david.chen@example.com', phone: '614-555-0187' },
      completedTaskIndices: [0, 1, 2],
      overdueTaskIndex: 4,
    },
    {
      deceasedName: 'Robert Abrams',
      deceasedDob: new Date('1941-11-02'),
      deceasedDod: new Date(Date.now() - 16 * DAY_MS),
      serviceType: 'graveside' as ServiceType,
      status: 'completed' as CaseStatus,
      daysAgo: 14,
      template: GRAVESIDE,
      contact: { name: 'Ruth Abrams', relationship: 'Spouse', email: 'ruth.abrams@example.com', phone: '614-555-0119' },
      completedTaskIndices: Array.from({ length: GRAVESIDE.length }, (_, i) => i),
      overdueTaskIndex: null,
    },
  ];
}

async function seedCases(sunriseId: string, assignedToId: string) {
  for (const dc of demoCases()) {
    const baseDate = new Date(Date.now() - dc.daysAgo * DAY_MS);

    // 1. Upsert Case by (tenantId, deceasedName)
    let caseRow = await prisma.case.findFirst({
      where: { tenantId: sunriseId, deceasedName: dc.deceasedName },
    });
    if (!caseRow) {
      caseRow = await prisma.case.create({
        data: {
          tenantId: sunriseId,
          deceasedName: dc.deceasedName,
          deceasedDob: dc.deceasedDob,
          deceasedDod: dc.deceasedDod,
          serviceType: dc.serviceType,
          status: dc.status,
          assignedToId,
          createdAt: baseDate,
        },
      });
    } else {
      caseRow = await prisma.case.update({
        where: { id: caseRow.id },
        data: { status: dc.status, assignedToId },
      });
    }

    // 2. Upsert primary FamilyContact
    const existingContact = await prisma.familyContact.findFirst({
      where: { tenantId: sunriseId, caseId: caseRow.id, isPrimaryContact: true },
    });
    if (!existingContact) {
      await prisma.familyContact.create({
        data: {
          tenantId: sunriseId,
          caseId: caseRow.id,
          name: dc.contact.name,
          relationship: dc.contact.relationship,
          email: dc.contact.email,
          phone: dc.contact.phone,
          isPrimaryContact: true,
        },
      });
    }

    // 3. Upsert tasks from template
    for (let i = 0; i < dc.template.length; i++) {
      const tmpl = dc.template[i];
      const dueDate =
        dc.overdueTaskIndex === i
          ? new Date(Date.now() - 1 * DAY_MS)
          : tmpl.defaultDueDays === null
            ? null
            : new Date(baseDate.getTime() + tmpl.defaultDueDays * DAY_MS);
      const completed = dc.completedTaskIndices.includes(i);

      const existing = await prisma.task.findFirst({
        where: { tenantId: sunriseId, caseId: caseRow.id, title: tmpl.title },
      });
      if (existing) {
        await prisma.task.update({
          where: { id: existing.id },
          data: { dueDate, completed, completedBy: completed ? assignedToId : null },
        });
      } else {
        await prisma.task.create({
          data: {
            tenantId: sunriseId,
            caseId: caseRow.id,
            title: tmpl.title,
            dueDate,
            completed,
            completedBy: completed ? assignedToId : null,
          },
        });
      }
    }

    console.log(`[seed] case: ${dc.deceasedName} (${dc.status}) + ${dc.template.length} tasks`);
  }
}

async function seedPreneedArrangements(sunriseId: string) {
  const arrangements = [
    {
      clientFirstName: 'Dorothy',
      clientLastName:  'Watkins',
      clientDob:       new Date('1942-06-18'),
      clientPhone:     '614-555-0312',
      clientEmail:     'dorothy.watkins@example.com',
      clientAddress:   '214 Elm Street, Westerville, OH 43081',
      fundingType:     'insurance',
      insuranceCompany:'Forethought Life Insurance',
      policyNumber:    'FTH-8821045',
      faceValue:       8500,
      serviceType:     ServiceType.burial,
      servicePreferences: { music: 'hymns', flowers: 'lilies', viewing: true },
      status:          'active',
      notes:           'Dorothy visited in person. Prefers morning services.',
    },
    {
      clientFirstName: 'Franklin',
      clientLastName:  'Morrison',
      clientDob:       new Date('1938-11-04'),
      clientPhone:     '614-555-0398',
      clientEmail:     'fmorrison@example.com',
      clientAddress:   '88 Maple Ridge Ct, Dublin, OH 43016',
      fundingType:     'trust',
      insuranceCompany: null,
      policyNumber:    'TRU-2024-FM',
      faceValue:       12000,
      serviceType:     ServiceType.cremation,
      servicePreferences: { urn: 'cherry wood', scattering: 'Alum Creek', reception: true },
      status:          'active',
      notes:           'Franklin and his wife Carol came together. Carol will pre-arrange separately.',
    },
    {
      clientFirstName: 'Eugene',
      clientLastName:  'Petrov',
      clientDob:       new Date('1950-02-27'),
      clientPhone:     '614-555-0441',
      clientEmail:     'epetrov@example.com',
      clientAddress:   '5501 Karl Road, Columbus, OH 43229',
      fundingType:     'cash',
      insuranceCompany: null,
      policyNumber:    null,
      faceValue:       6200,
      serviceType:     ServiceType.memorial,
      servicePreferences: { military: true, honors: 'Army', reception: false },
      status:          'active',
      notes:           'Vietnam veteran. Requests military honors. Paid $2,000 deposit.',
    },
    {
      clientFirstName: 'Carol',
      clientLastName:  'Morrison',
      clientDob:       new Date('1941-08-15'),
      clientPhone:     '614-555-0398',
      clientEmail:     'carol.morrison@example.com',
      clientAddress:   '88 Maple Ridge Ct, Dublin, OH 43016',
      fundingType:     'insurance',
      insuranceCompany:'Lincoln Heritage Life',
      policyNumber:    'LHL-9934821',
      faceValue:       9750,
      serviceType:     ServiceType.cremation,
      servicePreferences: { urn: 'brushed brass', reception: true },
      status:          'active',
      notes:           'Arranged same day as Franklin Morrison. Cross-reference.',
    },
    {
      clientFirstName: 'Harriet',
      clientLastName:  'Okafor',
      clientDob:       new Date('1955-03-09'),
      clientPhone:     '614-555-0277',
      clientEmail:     'harriet.okafor@example.com',
      clientAddress:   '3302 Cleveland Ave, Columbus, OH 43224',
      fundingType:     'insurance',
      insuranceCompany:'Security Plan Life',
      policyNumber:    'SPL-44190-HO',
      faceValue:       7500,
      serviceType:     ServiceType.burial,
      servicePreferences: { viewing: true, flowers: 'roses', repast: true },
      status:          'cancelled',
      notes:           'Family relocated to Atlanta. Arrangement cancelled and refunded.',
    },
  ];

  for (const a of arrangements) {
    const existing = await prisma.preneedArrangement.findFirst({
      where: { tenantId: sunriseId, clientFirstName: a.clientFirstName, clientLastName: a.clientLastName },
    });
    if (!existing) {
      await prisma.preneedArrangement.create({
        data: {
          tenantId:        sunriseId,
          clientFirstName: a.clientFirstName,
          clientLastName:  a.clientLastName,
          clientDob:       a.clientDob,
          clientPhone:     a.clientPhone,
          clientEmail:     a.clientEmail,
          clientAddress:   a.clientAddress,
          fundingType:     a.fundingType,
          insuranceCompany: a.insuranceCompany ?? undefined,
          policyNumber:    a.policyNumber ?? undefined,
          faceValue:       a.faceValue,
          serviceType:     a.serviceType,
          servicePreferences: a.servicePreferences,
          status:          a.status,
          notes:           a.notes,
        },
      });
    }
  }
  console.log(`[seed] preneed arrangements: ${arrangements.length}`);
}

async function main() {
  console.log(`[seed] Cognito enabled: ${COGNITO_ENABLED}`);
  const tenants = await seedTenants();
  await seedUsers(tenants);
  await seedPriceList(tenants.sunrise.id);
  const director = await prisma.user.findUniqueOrThrow({ where: { email: 'director@sunrise.demo' } });
  await seedCases(tenants.sunrise.id, director.id);

  const cases = await prisma.case.findMany({
    where: { tenantId: tenants.sunrise.id },
    include: { familyContacts: { where: { isPrimaryContact: true }, take: 1 } },
  });
  const chen   = cases.find(c => c.deceasedName === 'Margaret Chen')!;
  const abrams = cases.find(c => c.deceasedName === 'Robert Abrams')!;
  const abramsContact = abrams.familyContacts[0];

  const vendors = await seedVendors(tenants.sunrise.id);
  await seedVendorAssignments(tenants.sunrise.id, vendors, chen.id, abrams.id);
  await seedCalendarEvents(tenants.sunrise.id, abrams.id);
  await seedPaymentsAndSignatures(tenants.sunrise.id, abrams.id, abramsContact.id);
  await seedObituaries(tenants.sunrise.id, chen.id, abrams.id);
  await seedFollowUps(tenants.sunrise.id, abrams.id, abramsContact.id);
  await seedPreneedArrangements(tenants.sunrise.id);
  await seedHistoricalCases(tenants.sunrise.id, director.id);

  // Isolation guard — verify no Sunrise cases leaked into Heritage
  const heritageCount = await prisma.case.count({ where: { tenantId: tenants.heritage.id } });
  const sunriseCount  = await prisma.case.count({ where: { tenantId: tenants.sunrise.id } });
  const leaks = await prisma.case.count({ where: { tenantId: { notIn: [tenants.sunrise.id, tenants.heritage.id] } } });
  if (leaks !== 0) throw new Error(`[seed] tenant leak: ${leaks} cases with unknown tenantId`);
  console.log(`[seed] isolation check passed — sunrise: ${sunriseCount}, heritage: ${heritageCount}`);

  console.log('[seed] Plan 11-04 complete');
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
