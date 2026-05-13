/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ObituariesService } from './obituaries.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock { return fn as jest.Mock; }

describe('ObituariesService', () => {
  let service: ObituariesService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let scopedObituary: { findFirst: jest.Mock; upsert: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    scopedObituary = {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    };
    (mockPrisma._scoped as any).obituary = scopedObituary;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObituariesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ObituariesService>(ObituariesService);
  });

  describe('generate', () => {
    const baseCase = {
      id: 'case-1',
      deceasedName: 'John Doe',
      serviceType: 'burial',
      deceasedDob: null,
      deceasedDod: null,
      familyContacts: [],
    };

    it('throws NotFoundException when case is not found', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(service.generate('tenant-a', 'case-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException containing the caseId', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(service.generate('tenant-a', 'case-99')).rejects.toThrow('case-99');
    });

    it('calls obituary.upsert with draft status and generated text', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(baseCase);
      scopedObituary.upsert.mockResolvedValue({ id: 'ob-1' });

      await service.generate('tenant-a', 'case-1');

      expect(scopedObituary.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { caseId: 'case-1' },
          create: expect.objectContaining({ status: 'draft', tenantId: 'tenant-a', caseId: 'case-1' }),
        }),
      );
    });

    it('calculates age from dob/dod when both are provided', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({
        ...baseCase,
        deceasedDob: new Date('1940-01-01'),
        deceasedDod: new Date('2025-01-01'),
        familyContacts: [],
      });
      scopedObituary.upsert.mockResolvedValue({ id: 'ob-1' });

      await service.generate('tenant-a', 'case-1');

      const upsertCall = scopedObituary.upsert.mock.calls[0][0];
      expect(upsertCall.create.draftText).toContain('85');
    });

    it('includes primary contact name in generated text when contact exists', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue({
        ...baseCase,
        familyContacts: [{ name: 'Jane Doe', relationship: 'spouse', isPrimaryContact: true }],
      });
      scopedObituary.upsert.mockResolvedValue({ id: 'ob-1' });

      await service.generate('tenant-a', 'case-1');

      const upsertCall = scopedObituary.upsert.mock.calls[0][0];
      expect(upsertCall.create.draftText).toContain('Jane Doe');
    });
  });

  describe('findByCase', () => {
    it('returns obituary when found', async () => {
      const ob = { id: 'ob-1', caseId: 'case-1' };
      scopedObituary.findFirst.mockResolvedValue(ob);

      const result = await service.findByCase('tenant-a', 'case-1');

      expect(result).toEqual(ob);
    });

    it('throws NotFoundException when no obituary exists', async () => {
      scopedObituary.findFirst.mockResolvedValue(null);

      await expect(service.findByCase('tenant-a', 'case-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('calls obituary.update with provided text and optional status', async () => {
      scopedObituary.update.mockResolvedValue({ id: 'ob-1', draftText: 'updated text', status: 'approved' });

      await service.update('tenant-a', 'case-1', 'updated text', 'approved');

      expect(scopedObituary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { caseId: 'case-1' },
          data: expect.objectContaining({ draftText: 'updated text', status: 'approved' }),
        }),
      );
    });

    it('omits status from data when not provided', async () => {
      scopedObituary.update.mockResolvedValue({ id: 'ob-1' });

      await service.update('tenant-a', 'case-1', 'some text');

      const callData = scopedObituary.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('status');
    });
  });
});
