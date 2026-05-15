/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createMockPrisma } from '../../__mocks__/prisma.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asMock(fn: any): jest.Mock {
  return fn as jest.Mock;
}

describe('ContactsService', () => {
  let service: ContactsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  // Typed separately so TS doesn't complain about members not on the base mock shape
  let scopedContact: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();

    scopedContact = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    // Override familyContact on the scoped client
    (mockPrisma._scoped as any).familyContact = scopedContact;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  describe('create', () => {
    it('calls forTenant and familyContact.create with correct data', async () => {
      const dto = {
        name: 'Jane Doe',
        relationship: 'spouse',
        isPrimaryContact: true,
      } as any;
      const expected = {
        id: 'contact-1',
        caseId: 'case-1',
        tenantId: 'tenant-a',
        ...dto,
      };
      scopedContact.create.mockResolvedValue(expected);

      const result = await service.create('tenant-a', 'case-1', dto);

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedContact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caseId: 'case-1',
            tenantId: 'tenant-a',
            name: 'Jane Doe',
          }),
        }),
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findByCase', () => {
    it('calls forTenant and familyContact.findMany with caseId filter', async () => {
      scopedContact.findMany.mockResolvedValue([]);

      await service.findByCase('tenant-a', 'case-1');

      expect(mockPrisma.forTenant).toHaveBeenCalledWith('tenant-a');
      expect(scopedContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { caseId: 'case-1' } }),
      );
    });

    it('orders results with isPrimaryContact desc', async () => {
      scopedContact.findMany.mockResolvedValue([]);

      await service.findByCase('tenant-a', 'case-1');

      expect(scopedContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { isPrimaryContact: 'desc' } }),
      );
    });
  });

  describe('update', () => {
    it('updates contact when it exists', async () => {
      const existing = { id: 'contact-1' };
      const dto = { name: 'Jane Smith' } as any;
      scopedContact.findFirst.mockResolvedValue(existing);
      scopedContact.update.mockResolvedValue({ ...existing, ...dto });

      const result = await service.update('tenant-a', 'contact-1', dto);

      expect(scopedContact.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'contact-1' }, data: dto }),
      );
      expect(result).toHaveProperty('name', 'Jane Smith');
    });

    it('throws NotFoundException when contact does not exist', async () => {
      scopedContact.findFirst.mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'missing-id', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with contact id in message', async () => {
      scopedContact.findFirst.mockResolvedValue(null);

      await expect(
        service.update('tenant-a', 'contact-99', {} as any),
      ).rejects.toThrow('contact-99');
    });
  });

  describe('remove', () => {
    it('deletes contact when it exists', async () => {
      const existing = { id: 'contact-1' };
      scopedContact.findFirst.mockResolvedValue(existing);
      scopedContact.delete.mockResolvedValue(existing);

      await service.remove('tenant-a', 'contact-1');

      expect(scopedContact.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'contact-1' } }),
      );
    });

    it('throws NotFoundException when contact does not exist', async () => {
      scopedContact.findFirst.mockResolvedValue(null);

      await expect(service.remove('tenant-a', 'missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
