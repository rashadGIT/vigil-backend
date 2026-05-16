/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MemorialService } from './memorial.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

describe('MemorialService', () => {
  let service: MemorialService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let scopedMemorialPage: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  let bareMemorialPage: { findUnique: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    scopedMemorialPage = {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    };
    bareMemorialPage = { findUnique: jest.fn() };

    (mockPrisma._scoped as any).memorialPage = scopedMemorialPage;
    (mockPrisma as any).memorialPage = bareMemorialPage;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemorialService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MemorialService>(MemorialService);
  });

  describe('create', () => {
    const caseRecord = { id: 'case-1', deceasedName: 'John Doe' };

    it('throws NotFoundException when case does not exist', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(service.create('tenant-a', 'case-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException containing the caseId', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(null);

      await expect(service.create('tenant-a', 'case-99', {})).rejects.toThrow(
        'case-99',
      );
    });

    it('creates memorial page with slug derived from deceased name and caseId', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(caseRecord);
      scopedMemorialPage.create.mockResolvedValue({
        id: 'mem-1',
        slug: 'john-doe-se-1',
      });

      await service.create('tenant-a', 'case-1', {});

      expect(scopedMemorialPage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            caseId: 'case-1',
            slug: expect.stringContaining('john-doe'),
          }),
        }),
      );
    });

    it('sets published to false by default', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(caseRecord);
      scopedMemorialPage.create.mockResolvedValue({
        id: 'mem-1',
        published: false,
      });

      await service.create('tenant-a', 'case-1', {});

      const callData = scopedMemorialPage.create.mock.calls[0][0].data;
      expect(callData.published).toBe(false);
    });

    it('throws ConflictException on Prisma unique constraint violation (P2002)', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(caseRecord);
      const uniqueErr = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
      });
      scopedMemorialPage.create.mockRejectedValue(uniqueErr);

      await expect(service.create('tenant-a', 'case-1', {})).rejects.toThrow(
        ConflictException,
      );
    });

    it('re-throws non-unique errors', async () => {
      asMock(mockPrisma._scoped.case.findFirst).mockResolvedValue(caseRecord);
      scopedMemorialPage.create.mockRejectedValue(
        new Error('DB connection failed'),
      );

      await expect(service.create('tenant-a', 'case-1', {})).rejects.toThrow(
        'DB connection failed',
      );
    });
  });

  describe('getBySlug', () => {
    it('throws NotFoundException when memorial page does not exist', async () => {
      bareMemorialPage.findUnique.mockResolvedValue(null);

      await expect(service.getBySlug('unknown-slug')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when page exists but is not published', async () => {
      bareMemorialPage.findUnique.mockResolvedValue({
        id: 'mem-1',
        published: false,
        slug: 'john-doe-abc123',
      });

      await expect(service.getBySlug('john-doe-abc123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns page when it exists and is published', async () => {
      const page = { id: 'mem-1', published: true, slug: 'john-doe-abc123' };
      bareMemorialPage.findUnique.mockResolvedValue(page);

      const result = await service.getBySlug('john-doe-abc123');

      expect(result).toEqual(page);
    });
  });

  describe('addGuestbookEntry', () => {
    it('throws NotFoundException when page does not exist', async () => {
      bareMemorialPage.findUnique.mockResolvedValue(null);

      await expect(
        service.addGuestbookEntry('missing-slug', {
          name: 'Alice',
          message: 'Thoughts',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when page is not published', async () => {
      bareMemorialPage.findUnique.mockResolvedValue({
        id: 'mem-1',
        published: false,
        guestbookEntries: [],
      });

      await expect(
        service.addGuestbookEntry('slug', { name: 'Alice', message: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('appends new entry to existing guestbookEntries array', async () => {
      const page = {
        id: 'mem-1',
        published: true,
        tenantId: 'tenant-a',
        guestbookEntries: [
          {
            name: 'Bob',
            message: 'RIP',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      };
      bareMemorialPage.findUnique.mockResolvedValue(page);
      scopedMemorialPage.update.mockResolvedValue({
        ...page,
        guestbookEntries: [...page.guestbookEntries, {}],
      });

      await service.addGuestbookEntry('slug', {
        name: 'Alice',
        message: 'Condolences',
      });

      const callData = scopedMemorialPage.update.mock.calls[0][0].data;
      expect(callData.guestbookEntries).toHaveLength(2);
      expect(callData.guestbookEntries[1]).toMatchObject({
        name: 'Alice',
        message: 'Condolences',
      });
    });

    it('adds createdAt timestamp to the new entry', async () => {
      const page = {
        id: 'mem-1',
        published: true,
        tenantId: 'tenant-a',
        guestbookEntries: [],
      };
      bareMemorialPage.findUnique.mockResolvedValue(page);
      scopedMemorialPage.update.mockResolvedValue(page);

      await service.addGuestbookEntry('slug', { name: 'Alice', message: 'Hi' });

      const callData = scopedMemorialPage.update.mock.calls[0][0].data;
      expect(callData.guestbookEntries[0]).toHaveProperty('createdAt');
    });
  });

  describe('update', () => {
    it('updates memorial page when it exists', async () => {
      const existing = { id: 'mem-1' };
      const updated = { id: 'mem-1', content: 'updated' };
      scopedMemorialPage.findFirst.mockResolvedValue(existing);
      scopedMemorialPage.update.mockResolvedValue(updated);

      const result = await service.update('tenant-a', 'mem-1', { content: 'updated' } as any);

      expect(result).toEqual(updated);
      expect(scopedMemorialPage.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'mem-1' } }),
      );
    });

    it('throws NotFoundException when memorial page does not exist', async () => {
      scopedMemorialPage.findFirst.mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
