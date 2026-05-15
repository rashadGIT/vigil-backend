/** @jest-environment node */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const VALID_KEY = 'test-internal-key-999';

function createInternalPrismaMock() {
  return {
    forTenant: jest.fn().mockReturnValue({}),
    case: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    task: { findMany: jest.fn().mockResolvedValue([]) },
    tenant: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    document: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('Internal API (contract)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = 'true';
    process.env.INTERNAL_API_KEY = VALID_KEY;
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://vigil:vigil@localhost:5432/vigil_dev';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createInternalPrismaMock())
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
    delete process.env.INTERNAL_API_KEY;
  });

  it('POST /internal/documents/generate-service-program/:id without key returns 401 or 403', async () => {
    const res = await request(app.getHttpServer()).post(
      '/internal/documents/generate-service-program/case-123',
    );
    expect([401, 403]).toContain(res.status);
  });

  it('GET /internal/cases/pending-hard-delete with correct key returns 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/internal/cases/pending-hard-delete')
      .set('x-vigil-internal-key', VALID_KEY);
    expect(res.status).toBe(200);
  });
});
