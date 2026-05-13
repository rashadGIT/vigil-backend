import { jest } from '@jest/globals';

export function makeScopedClient() {
  return {
    case: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    task: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    familyContact: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    followUp: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    calendarEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    tenant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };
}

export function createMockPrisma() {
  const scoped = makeScopedClient();

  // $transaction mock: invokes callback with a tx shaped like scoped client
  const txClient = makeScopedClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const $transaction = jest.fn().mockImplementation(async (cb: any) => cb(txClient) as Promise<unknown>);

  const forTenant = jest.fn().mockReturnValue(scoped);

  return {
    forTenant,
    $transaction,
    // bare (cross-tenant) model accessors
    case: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    // expose scoped and txClient for per-test spy assertions
    _scoped: scoped,
    _tx: txClient,
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
