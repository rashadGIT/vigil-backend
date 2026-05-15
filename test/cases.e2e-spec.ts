/** @jest-environment node */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CaseStatus } from '@prisma/client';

function createCasesPrismaMock() {
  const scopedClient = {
    case: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({
        id: 'case-1',
        status: CaseStatus.new,
        deletedAt: null,
      }),
      create: jest.fn().mockResolvedValue({
        id: 'case-new',
        tenantId: 'tenant-a',
        status: CaseStatus.new,
      }),
      update: jest
        .fn()
        .mockResolvedValue({ id: 'case-1', status: CaseStatus.in_progress }),
    },
    task: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    forTenant: jest.fn().mockReturnValue(scopedClient),
    case: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    task: { findMany: jest.fn().mockResolvedValue([]) },
    tenant: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    _scoped: scopedClient,
  };
}

const DEV_USER_HEADER = 'sub-1|tenant-a|admin|admin@test.com';

describe('Cases API — with DEV_AUTH_BYPASS (contract)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = 'true';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://vigil:vigil@localhost:5432/vigil_dev';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createCasesPrismaMock())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.DEV_AUTH_BYPASS;
  });

  it('GET /cases returns 200 array with x-dev-user header', async () => {
    const res = await request(app.getHttpServer())
      .get('/cases')
      .set('x-dev-user', DEV_USER_HEADER);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /cases returns 201 with valid body and auth', async () => {
    const res = await request(app.getHttpServer())
      .post('/cases')
      .set('x-dev-user', DEV_USER_HEADER)
      .send({ deceasedName: 'Test Person', serviceType: 'burial' });
    expect(res.status).toBe(201);
  });
});

describe('Cases API — auth guard rejection (contract)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // DEV_AUTH_BYPASS must be off (or absent) to test auth rejection
    delete process.env.DEV_AUTH_BYPASS;
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://vigil:vigil@localhost:5432/vigil_dev';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createCasesPrismaMock())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /cases returns 401 without Bearer token (auth guard active)', async () => {
    const res = await request(app.getHttpServer()).get('/cases');
    expect([401, 403]).toContain(res.status);
  });
});
