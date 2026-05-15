/**
 * Tenant Isolation Integration Test
 *
 * REQUIRES: TEST_DATABASE_URL env var pointing to a real Postgres instance
 * (docker-compose.test.yml starts postgres:16 on port 5433)
 *
 * Run manually:
 *   TEST_DATABASE_URL=postgresql://vigil:vigil@localhost:5433/vigil_test \
 *   npx jest test/tenant-isolation.e2e-spec.ts --no-coverage
 *
 * Skipped automatically when TEST_DATABASE_URL is not set.
 * jest.config.ts excludes this file from the default test run via testPathIgnorePatterns.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/common/prisma/prisma.service';

const DATABASE_URL = process.env.TEST_DATABASE_URL;

// Skip entire suite if no test DB is available — does not fail unit CI
const describeIf = DATABASE_URL ? describe : describe.skip;

describeIf('Tenant Isolation (integration — requires real DB)', () => {
  let prisma: PrismaService;
  let rawPrisma: PrismaClient; // bypasses forTenant() — used for seed + teardown only

  let tenantAId: string;
  let tenantBId: string;
  let caseAId: string;
  let caseBId: string;

  beforeAll(async () => {
    // Use a dedicated test DB so dev data is never touched
    rawPrisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
    });
    await rawPrisma.$connect();

    // Override DATABASE_URL in process so PrismaService connects to the test DB
    process.env.DATABASE_URL = DATABASE_URL!;
    prisma = new PrismaService();
    await prisma.onModuleInit();

    // Seed two independent tenants — Tenant model is UNSCOPED (no tenantId column)
    const suffix = Date.now();
    const tenantA = await rawPrisma.tenant.create({
      data: {
        name: 'Isolation Test Tenant A',
        slug: `iso-tenant-a-${suffix}`,
        subdomain: `iso-a-${suffix}`,
      },
    });
    const tenantB = await rawPrisma.tenant.create({
      data: {
        name: 'Isolation Test Tenant B',
        slug: `iso-tenant-b-${suffix}`,
        subdomain: `iso-b-${suffix}`,
      },
    });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    // Seed one case per tenant using rawPrisma (bypasses forTenant() intentionally)
    const caseA = await rawPrisma.case.create({
      data: {
        tenantId: tenantAId,
        deceasedName: 'Alice (Tenant A)',
        serviceType: 'burial',
      },
    });
    const caseB = await rawPrisma.case.create({
      data: {
        tenantId: tenantBId,
        deceasedName: 'Bob (Tenant B)',
        serviceType: 'cremation',
      },
    });
    caseAId = caseA.id;
    caseBId = caseB.id;
  });

  afterAll(async () => {
    // Delete child records first (FK constraints), then tenants
    await rawPrisma.case.deleteMany({
      where: { id: { in: [caseAId, caseBId] } },
    });
    await rawPrisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
    await rawPrisma.$disconnect();
    await prisma.onModuleDestroy();
  });

  it('forTenant(A).case.findMany() returns only Tenant A case', async () => {
    const cases = await prisma.forTenant(tenantAId).case.findMany({
      where: { deletedAt: null },
    });
    const ids = cases.map((c) => c.id);
    expect(ids).toContain(caseAId);
    expect(ids).not.toContain(caseBId);
    expect(cases.every((c) => c.tenantId === tenantAId)).toBe(true);
  });

  it('forTenant(B).case.findMany() returns only Tenant B case', async () => {
    const cases = await prisma.forTenant(tenantBId).case.findMany({
      where: { deletedAt: null },
    });
    const ids = cases.map((c) => c.id);
    expect(ids).toContain(caseBId);
    expect(ids).not.toContain(caseAId);
    expect(cases.every((c) => c.tenantId === tenantBId)).toBe(true);
  });

  it('forTenant(A).case.findFirst({ where: { id: caseBId } }) returns null', async () => {
    // Direct cross-tenant read attempt — forTenant() must block this
    const result = await prisma.forTenant(tenantAId).case.findFirst({
      where: { id: caseBId },
    });
    expect(result).toBeNull();
  });
});
