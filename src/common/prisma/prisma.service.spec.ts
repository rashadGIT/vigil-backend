/**
 * @jest-environment node
 */

// Prevent actual DB connection — mock PrismaClient before importing PrismaService
jest.mock('@prisma/client', () => {
  class MockPrismaClient {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
    $extends = jest.fn().mockReturnValue({});
  }
  return { PrismaClient: MockPrismaClient };
});

import { PrismaService } from './prisma.service';

describe('PrismaService.forTenant()', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it('throws when tenantId is empty string', () => {
    expect(() => service.forTenant('')).toThrow(
      'forTenant() called without tenantId',
    );
  });

  it('throws when tenantId is undefined', () => {
    expect(() => service.forTenant(undefined as unknown as string)).toThrow(
      'forTenant() called without tenantId',
    );
  });

  it('does not throw when tenantId is a non-empty string', () => {
    expect(() => service.forTenant('tenant-a')).not.toThrow();
  });

  it('returns a value when called with a valid tenantId', () => {
    const result = service.forTenant('tenant-a');
    expect(result).toBeDefined();
  });
});
