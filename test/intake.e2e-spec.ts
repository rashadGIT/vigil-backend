/** @jest-environment node */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

// Minimal Prisma mock shaped for intake flow
function createIntakePrismaMock() {
  const VALID_TENANT_ID = 'tenant-a';

  const txClient = {
    case: { create: jest.fn().mockResolvedValue({ id: 'case-generated-id', tenantId: VALID_TENANT_ID }) },
    familyContact: { create: jest.fn().mockResolvedValue({}) },
    task: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
    calendarEvent: { create: jest.fn().mockResolvedValue({}) },
  };

  return {
    tenant: {
      findUnique: jest.fn().mockImplementation(({ where: { slug } }: { where: { slug: string } }) => {
        if (slug === 'sunrise') return Promise.resolve({ id: VALID_TENANT_ID, active: true });
        return Promise.resolve(null);
      }),
    },
    $transaction: jest.fn().mockImplementation(async (cb: (tx: typeof txClient) => unknown) => cb(txClient)),
    forTenant: jest.fn().mockReturnValue({}),
  };
}

describe('POST /intake/:slug (contract)', () => {
  let app: INestApplication;
  let prismaMock: ReturnType<typeof createIntakePrismaMock>;

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = 'true';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://vigil:vigil@localhost:5432/vigil_dev';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useFactory({ factory: () => { prismaMock = createIntakePrismaMock(); return prismaMock; } })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.DEV_AUTH_BYPASS;
  });

  beforeEach(() => jest.clearAllMocks());

  const validBody = {
    deceasedName: 'John Doe',
    serviceType: 'burial',
    primaryContact: { name: 'Jane Doe', relationship: 'spouse' },
  };

  it('returns 201 with caseId for valid payload and known slug', async () => {
    const res = await request(app.getHttpServer())
      .post('/intake/sunrise')
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ caseId: expect.any(String) });
  });

  it('returns 404 for unknown slug', async () => {
    const res = await request(app.getHttpServer())
      .post('/intake/unknown-slug')
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it('returns 400 when deceasedName is missing', async () => {
    const { deceasedName: _, ...bodyWithout } = validBody;
    const res = await request(app.getHttpServer())
      .post('/intake/sunrise')
      .send(bodyWithout);
    expect(res.status).toBe(400);
  });

  it('returns 400 when primaryContact is missing', async () => {
    const { primaryContact: _, ...bodyWithout } = validBody;
    const res = await request(app.getHttpServer())
      .post('/intake/sunrise')
      .send(bodyWithout);
    expect(res.status).toBe(400);
  });

  it('returns 400 when serviceType is invalid enum value', async () => {
    const res = await request(app.getHttpServer())
      .post('/intake/sunrise')
      .send({ ...validBody, serviceType: 'funeral' }); // not a valid ServiceType
    expect(res.status).toBe(400);
  });
});
