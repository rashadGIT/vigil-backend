/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

describe('TrackingService', () => {
  let service: TrackingService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let scopedTracking: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    scopedTracking = {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    (mockPrisma._scoped as any).decedentTracking = scopedTracking;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
  });

  describe('upsert', () => {
    const dto = { currentLocation: 'morgue', status: 'in_care' } as any;

    it('creates tracking record when none exists for case', async () => {
      scopedTracking.findFirst.mockResolvedValue(null);
      scopedTracking.create.mockResolvedValue({
        id: 'track-1',
        caseId: 'case-1',
        ...dto,
      });

      const result = await service.upsert('tenant-a', 'case-1', dto, 'user-1');

      expect(scopedTracking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            caseId: 'case-1',
            updatedBy: 'user-1',
          }),
        }),
      );
      expect(scopedTracking.update).not.toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'track-1');
    });

    it('updates tracking record when one already exists', async () => {
      const existing = { id: 'track-existing', caseId: 'case-1' };
      scopedTracking.findFirst.mockResolvedValue(existing);
      scopedTracking.update.mockResolvedValue({
        ...existing,
        ...dto,
        updatedBy: 'user-1',
      });

      const result = await service.upsert('tenant-a', 'case-1', dto, 'user-1');

      expect(scopedTracking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'track-existing' },
          data: expect.objectContaining({ updatedBy: 'user-1' }),
        }),
      );
      expect(scopedTracking.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'track-existing');
    });

    it('calls forTenant with the tenantId', async () => {
      scopedTracking.findFirst.mockResolvedValue(null);
      scopedTracking.create.mockResolvedValue({ id: 'track-1' });

      await service.upsert('tenant-a', 'case-1', dto, 'user-1');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
    });
  });

  describe('findByCase', () => {
    it('returns tracking record when found', async () => {
      const record = {
        id: 'track-1',
        caseId: 'case-1',
        currentLocation: 'chapel',
      };
      // findByCase uses a second forTenant call separately
      const scopedTracking2 = {
        findFirst: jest.fn().mockResolvedValue(record),
      };
      asMock(mockPrisma.forTenant).mockReturnValue({
        ...mockPrisma._scoped,
        decedentTracking: scopedTracking2,
      } as any);

      const result = await service.findByCase('tenant-a', 'case-1');

      expect(result).toEqual(record);
    });

    it('throws NotFoundException when no tracking record exists', async () => {
      const scopedTracking2 = { findFirst: jest.fn().mockResolvedValue(null) };
      asMock(mockPrisma.forTenant).mockReturnValue({
        ...mockPrisma._scoped,
        decedentTracking: scopedTracking2,
      } as any);

      await expect(service.findByCase('tenant-a', 'case-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException containing the caseId', async () => {
      const scopedTracking2 = { findFirst: jest.fn().mockResolvedValue(null) };
      asMock(mockPrisma.forTenant).mockReturnValue({
        ...mockPrisma._scoped,
        decedentTracking: scopedTracking2,
      } as any);

      await expect(service.findByCase('tenant-a', 'case-99')).rejects.toThrow(
        'case-99',
      );
    });
  });
});
