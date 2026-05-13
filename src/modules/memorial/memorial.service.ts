import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMemorialDto, GuestbookEntryDto, UpdateMemorialDto } from './dto/memorial.dto';

@Injectable()
export class MemorialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, caseId: string, dto: CreateMemorialDto) {
    const scoped = this.prisma.forTenant(tenantId);
    const caseRecord = await scoped.case.findFirst({ where: { id: caseId } });
    if (!caseRecord) throw new NotFoundException(`Case ${caseId} not found`);

    const slug =
      caseRecord.deceasedName.toLowerCase().replace(/\s+/g, '-') +
      '-' +
      caseId.slice(-6);

    try {
      return await scoped.memorialPage.create({
        data: {
          tenantId,
          caseId,
          slug,
          photoUrls: dto.photoUrls ?? [],
          published: dto.published ?? false,
        },
      });
    } catch (err: unknown) {
      const isUniqueViolation =
        err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002';
      if (isUniqueViolation) {
        throw new ConflictException(`Memorial page already exists for case ${caseId}`);
      }
      throw err;
    }
  }

  async getBySlug(slug: string) {
    // Slug lookup is unscoped — tenantId unknown from slug alone
    const page = await this.prisma.memorialPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Memorial page not found`);
    if (!page.published) throw new NotFoundException(`Memorial page not found`);
    return page;
  }

  async update(tenantId: string, id: string, dto: UpdateMemorialDto) {
    const existing = await this.prisma.forTenant(tenantId).memorialPage.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Memorial page ${id} not found`);
    return this.prisma.forTenant(tenantId).memorialPage.update({
      where: { id },
      data: dto,
    });
  }

  async addGuestbookEntry(slug: string, entry: GuestbookEntryDto) {
    const page = await this.prisma.memorialPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Memorial page not found`);
    if (!page.published) throw new NotFoundException(`Memorial page not found`);

    const existing = Array.isArray(page.guestbookEntries) ? page.guestbookEntries : [];
    const newEntry = { ...entry, createdAt: new Date().toISOString() };

    return this.prisma.forTenant(page.tenantId).memorialPage.update({
      where: { id: page.id },
      data: { guestbookEntries: [...(existing as object[]), newEntry] },
    });
  }
}
