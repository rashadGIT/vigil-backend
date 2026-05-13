/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nService } from '../n8n/n8n.service';
import { N8nEvent } from '../n8n/n8n-events.enum';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock { return fn as jest.Mock; }

describe('VendorsService', () => {
  let service: VendorsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const mockN8n = { trigger: jest.fn().mockResolvedValue(undefined) };

  let scopedVendor: { findMany: jest.Mock; create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  let scopedVendorAssignment: { create: jest.Mock; findMany: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    scopedVendor = {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    };
    scopedVendorAssignment = {
      create: jest.fn(),
      findMany: jest.fn(),
    };
    (mockPrisma._scoped as any).vendor = scopedVendor;
    (mockPrisma._scoped as any).vendorAssignment = scopedVendorAssignment;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: N8nService, useValue: mockN8n },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  describe('findAll', () => {
    it('calls forTenant and vendor.findMany excluding deleted/archived', async () => {
      scopedVendor.findMany.mockResolvedValue([]);

      await service.findAll('tenant-a');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedVendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null, archivedAt: null }),
        }),
      );
    });

    it('orders by name asc', async () => {
      scopedVendor.findMany.mockResolvedValue([]);

      await service.findAll('tenant-a');

      expect(scopedVendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('create', () => {
    it('calls forTenant and vendor.create with tenantId injected', async () => {
      const dto = { name: 'Acme Flowers', type: 'florist' } as any;
      scopedVendor.create.mockResolvedValue({ id: 'vendor-1', tenantId: 'tenant-a', ...dto });

      const result = await service.create('tenant-a', dto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedVendor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant-a', name: 'Acme Flowers' }),
        }),
      );
      expect(result).toHaveProperty('id', 'vendor-1');
    });
  });

  describe('update', () => {
    it('updates vendor when it exists', async () => {
      const existing = { id: 'vendor-1' };
      const dto = { name: 'Updated Flowers' } as any;
      scopedVendor.findFirst.mockResolvedValue(existing);
      scopedVendor.update.mockResolvedValue({ ...existing, ...dto });

      await service.update('tenant-a', 'vendor-1', dto);

      expect(scopedVendor.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'vendor-1' }, data: dto }),
      );
    });

    it('throws NotFoundException when vendor does not exist', async () => {
      scopedVendor.findFirst.mockResolvedValue(null);

      await expect(service.update('tenant-a', 'missing', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with vendor id in message', async () => {
      scopedVendor.findFirst.mockResolvedValue(null);

      await expect(service.update('tenant-a', 'vendor-99', {} as any)).rejects.toThrow('vendor-99');
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt on vendor record', async () => {
      scopedVendor.update.mockResolvedValue({ id: 'vendor-1', deletedAt: new Date() });

      await service.softDelete('tenant-a', 'vendor-1');

      expect(scopedVendor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vendor-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('assignToCase', () => {
    it('creates vendor assignment and triggers STAFF_NOTIFY', async () => {
      const assignment = { id: 'assign-1', vendorId: 'vendor-1', caseId: 'case-1' };
      scopedVendorAssignment.create.mockResolvedValue(assignment);

      const result = await service.assignToCase('tenant-a', 'case-1', { vendorId: 'vendor-1' });

      expect(scopedVendorAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant-a', caseId: 'case-1', vendorId: 'vendor-1' }),
        }),
      );
      expect(mockN8n.trigger).toHaveBeenCalledWith(
        N8nEvent.STAFF_NOTIFY,
        expect.objectContaining({ event: 'vendor_assigned', tenantId: 'tenant-a', caseId: 'case-1' }),
      );
      expect(result).toEqual(assignment);
    });

    it('passes role from dto when provided', async () => {
      scopedVendorAssignment.create.mockResolvedValue({ id: 'assign-1' });

      await service.assignToCase('tenant-a', 'case-1', { vendorId: 'vendor-1', role: 'embalmer' });

      expect(scopedVendorAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'embalmer' }),
        }),
      );
    });
  });

  describe('findAssignmentsByCase', () => {
    it('calls forTenant and vendorAssignment.findMany with caseId filter including vendor', async () => {
      scopedVendorAssignment.findMany.mockResolvedValue([]);

      await service.findAssignmentsByCase('tenant-a', 'case-1');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedVendorAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { caseId: 'case-1' },
          include: { vendor: true },
        }),
      );
    });
  });
});
