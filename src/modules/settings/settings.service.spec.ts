/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock { return fn as jest.Mock; }

describe('SettingsService', () => {
  let service: SettingsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let bareTenant: { findUnique: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    // Replace the bare tenant accessor with one that also has update
    bareTenant = { findUnique: jest.fn(), update: jest.fn() };
    (mockPrisma as any).tenant = bareTenant;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('get', () => {
    it('returns name and googleReviewUrl when tenant exists', async () => {
      bareTenant.findUnique.mockResolvedValue({
        id: 'tenant-a',
        name: 'Sunrise Funeral',
        googleReviewUrl: 'https://g.co/r/sunrise',
      });

      const result = await service.get('tenant-a');

      expect(result).toEqual({
        name: 'Sunrise Funeral',
        googleReviewUrl: 'https://g.co/r/sunrise',
      });
    });

    it('calls tenant.findUnique with tenantId', async () => {
      bareTenant.findUnique.mockResolvedValue({ name: 'Test Home', googleReviewUrl: null });

      await service.get('tenant-a');

      expect(bareTenant.findUnique).toHaveBeenCalledWith({ where: { id: 'tenant-a' } });
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      bareTenant.findUnique.mockResolvedValue(null);

      await expect(service.get('missing-tenant')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with "Tenant not found" message', async () => {
      bareTenant.findUnique.mockResolvedValue(null);

      await expect(service.get('missing-tenant')).rejects.toThrow('Tenant not found');
    });
  });

  describe('update', () => {
    it('updates name when provided', async () => {
      bareTenant.update.mockResolvedValue({ name: 'New Name', googleReviewUrl: null });

      await service.update('tenant-a', { name: 'New Name' });

      expect(bareTenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-a' },
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
    });

    it('updates googleReviewUrl when provided', async () => {
      bareTenant.update.mockResolvedValue({ name: 'Same Name', googleReviewUrl: 'https://g.co/r/new' });

      await service.update('tenant-a', { googleReviewUrl: 'https://g.co/r/new' });

      expect(bareTenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ googleReviewUrl: 'https://g.co/r/new' }),
        }),
      );
    });

    it('omits undefined fields from update data', async () => {
      bareTenant.update.mockResolvedValue({ name: 'Name', googleReviewUrl: null });

      await service.update('tenant-a', { name: 'Name' });

      const callData = bareTenant.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('googleReviewUrl');
    });

    it('returns name and googleReviewUrl from updated tenant', async () => {
      bareTenant.update.mockResolvedValue({ name: 'Updated Name', googleReviewUrl: 'https://g.co/updated' });

      const result = await service.update('tenant-a', { name: 'Updated Name' });

      expect(result).toEqual({ name: 'Updated Name', googleReviewUrl: 'https://g.co/updated' });
    });
  });
});
