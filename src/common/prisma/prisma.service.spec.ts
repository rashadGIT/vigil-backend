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

  it('calls $extends and returns its result', () => {
    const mockExtended = { case: { findMany: jest.fn() } };
    jest.spyOn(service, '$extends').mockReturnValue(mockExtended as any);

    const result = service.forTenant('tenant-1');

    expect(service.$extends).toHaveBeenCalled();
    expect(result).toBe(mockExtended);
  });

  describe('$allOperations transformer', () => {
    let capturedConfig: any;

    beforeEach(() => {
      capturedConfig = undefined;
      jest.spyOn(service, '$extends').mockImplementation((config: any) => {
        capturedConfig = config;
        return {} as any;
      });
      service.forTenant('tenant-1');
    });

    it('passes args unchanged for unscoped model "Tenant"', async () => {
      const query = jest.fn().mockResolvedValue('ok');
      const inputArgs = { where: { id: 'x' } };
      const allOps = capturedConfig.query.$allModels.$allOperations;

      await allOps({
        model: 'Tenant',
        operation: 'findUnique',
        args: inputArgs,
        query,
      });

      expect(query).toHaveBeenCalledWith(inputArgs);
    });

    it('merges tenantId into existing where clause on findMany', async () => {
      const query = jest.fn().mockResolvedValue([]);
      const inputArgs = { where: { status: 'new' } };
      const allOps = capturedConfig.query.$allModels.$allOperations;

      await allOps({
        model: 'Case',
        operation: 'findMany',
        args: inputArgs,
        query,
      });

      const calledWith = query.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({
        status: 'new',
        tenantId: 'tenant-1',
      });
    });

    it('injects { tenantId } when no where clause present on findMany', async () => {
      const query = jest.fn().mockResolvedValue([]);
      const inputArgs = {};
      const allOps = capturedConfig.query.$allModels.$allOperations;

      await allOps({
        model: 'Case',
        operation: 'findMany',
        args: inputArgs,
        query,
      });

      const calledWith = query.mock.calls[0][0];
      expect(calledWith.where).toEqual({ tenantId: 'tenant-1' });
    });

    it('injects tenantId into data on create', async () => {
      const query = jest.fn().mockResolvedValue({ id: '1' });
      const inputArgs = { data: { deceasedName: 'John Doe' } };
      const allOps = capturedConfig.query.$allModels.$allOperations;

      await allOps({
        model: 'Case',
        operation: 'create',
        args: inputArgs,
        query,
      });

      const calledWith = query.mock.calls[0][0];
      expect(calledWith.data).toMatchObject({
        deceasedName: 'John Doe',
        tenantId: 'tenant-1',
      });
    });

    it('merges tenantId into where for upsert operation', async () => {
      const query = jest.fn().mockResolvedValue({});
      const inputArgs = {
        where: { cognitoSub: 'sub-1' },
        data: { email: 'a@b.com' },
      };
      const allOps = capturedConfig.query.$allModels.$allOperations;

      await allOps({
        model: 'User',
        operation: 'upsert',
        args: inputArgs,
        query,
      });

      const calledWith = query.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({
        cognitoSub: 'sub-1',
        tenantId: 'tenant-1',
      });
    });

    it('injects tenantId into where for update operation', async () => {
      const query = jest.fn().mockResolvedValue({});
      const inputArgs = {
        where: { id: 'case-1' },
        data: { status: 'archived' },
      };
      const allOps = capturedConfig.query.$allModels.$allOperations;

      await allOps({
        model: 'Case',
        operation: 'update',
        args: inputArgs,
        query,
      });

      const calledWith = query.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({
        id: 'case-1',
        tenantId: 'tenant-1',
      });
    });

    it('injects where: { tenantId } for count when no where provided', async () => {
      const query = jest.fn().mockResolvedValue(5);
      const inputArgs = {};
      const allOps = capturedConfig.query.$allModels.$allOperations;

      await allOps({
        model: 'Case',
        operation: 'count',
        args: inputArgs,
        query,
      });

      const calledWith = query.mock.calls[0][0];
      expect(calledWith.where).toEqual({ tenantId: 'tenant-1' });
    });

    it('does not inject tenantId into array data', async () => {
      const query = jest.fn().mockResolvedValue({});
      const inputArgs = { data: [{ name: 'a' }, { name: 'b' }] };
      const allOps = capturedConfig.query.$allModels.$allOperations;

      await allOps({
        model: 'Task',
        operation: 'createMany',
        args: inputArgs,
        query,
      });

      const calledWith = query.mock.calls[0][0];
      expect(Array.isArray(calledWith.data)).toBe(true);
      expect(calledWith.data[0]).not.toHaveProperty('tenantId');
    });
  });
});
