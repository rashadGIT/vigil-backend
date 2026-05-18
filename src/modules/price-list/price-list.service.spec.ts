/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PriceListService } from './price-list.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfService } from '../documents/pdf.service';
import { S3Service } from '../documents/s3.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

describe('PriceListService', () => {
  let service: PriceListService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let scopedPriceListItem: {
    findMany: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  let scopedDocument: { create: jest.Mock };
  let scopedAuditLog: { create: jest.Mock };

  const mockPdf = {
    generateGpl: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  };
  const mockS3 = {
    buildKey: jest.fn().mockReturnValue('tenants/tenant-a/case-1/gpl.pdf'),
    uploadBuffer: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    scopedPriceListItem = {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    };
    scopedDocument = { create: jest.fn() };
    scopedAuditLog = { create: jest.fn() };
    (mockPrisma._scoped as any).priceListItem = scopedPriceListItem;
    (mockPrisma._scoped as any).document = scopedDocument;
    (mockPrisma._scoped as any).auditLog = scopedAuditLog;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceListService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PdfService, useValue: mockPdf },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<PriceListService>(PriceListService);
  });

  describe('findAll', () => {
    it('calls forTenant and priceListItem.findMany for active items', async () => {
      scopedPriceListItem.findMany.mockResolvedValue([]);

      await service.findAll('tenant-a');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedPriceListItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } }),
      );
    });

    it('orders by category asc then sortOrder asc', async () => {
      scopedPriceListItem.findMany.mockResolvedValue([]);

      await service.findAll('tenant-a');

      expect(scopedPriceListItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        }),
      );
    });
  });

  describe('create', () => {
    it('calls forTenant and priceListItem.create with tenantId injected', async () => {
      const dto = {
        name: 'Basic Service',
        price: 1500,
        category: 'services',
      } as any;
      scopedPriceListItem.create.mockResolvedValue({
        id: 'item-1',
        tenantId: 'tenant-a',
        ...dto,
      });

      const result = await service.create('tenant-a', dto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedPriceListItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            name: 'Basic Service',
          }),
        }),
      );
      expect(result).toHaveProperty('id', 'item-1');
    });
  });

  describe('update', () => {
    it('updates item when it exists', async () => {
      const existing = { id: 'item-1' };
      const dto = { price: 2000 } as any;
      scopedPriceListItem.findFirst.mockResolvedValue(existing);
      scopedPriceListItem.update.mockResolvedValue({ ...existing, ...dto });

      await service.update('tenant-a', 'item-1', dto);

      expect(scopedPriceListItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'item-1' }, data: dto }),
      );
    });

    it('throws NotFoundException when item does not exist', async () => {
      scopedPriceListItem.findFirst.mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with item id in message', async () => {
      scopedPriceListItem.findFirst.mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'item-99', {} as any),
      ).rejects.toThrow('item-99');
    });
  });

  describe('generateGplPdf', () => {
    it('calls pdfService.generateGpl and s3.uploadBuffer', async () => {
      scopedDocument.create.mockResolvedValue({});
      scopedAuditLog.create.mockResolvedValue({});

      await service.generateGplPdf('tenant-a', 'case-1', 'user-1');

      expect(mockPdf.generateGpl).toHaveBeenCalledWith('case-1', 'tenant-a');
      expect(mockS3.uploadBuffer).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        'application/pdf',
      );
    });

    it('returns s3Key', async () => {
      scopedDocument.create.mockResolvedValue({});
      scopedAuditLog.create.mockResolvedValue({});

      const result = await service.generateGplPdf(
        'tenant-a',
        'case-1',
        'user-1',
      );

      expect(result).toHaveProperty('s3Key');
    });
  });

  describe('logGplView', () => {
    it('creates an audit log entry', async () => {
      scopedAuditLog.create.mockResolvedValue({});

      await service.logGplView('tenant-a', 'user-1');

      expect(scopedAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'gpl_view',
            userId: 'user-1',
          }),
        }),
      );
    });
  });

  describe('getGplAuditLog', () => {
    it('returns audit log entries for gpl_view and gpl_sent', async () => {
      const entries = [{ id: 'log-1', action: 'gpl_view' }];
      (mockPrisma._scoped as any).auditLog = {
        ...scopedAuditLog,
        findMany: jest.fn().mockResolvedValue(entries),
      };
      (mockPrisma.forTenant as jest.Mock).mockReturnValue(mockPrisma._scoped);

      const result = await service.getGplAuditLog('tenant-a');

      expect(result).toEqual(entries);
    });
  });
});
