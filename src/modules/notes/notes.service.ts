import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    caseId: string,
    authorId: string,
    dto: CreateNoteDto,
  ) {
    // Verify case belongs to tenant before creating note
    const caseExists = await this.prisma.forTenant(tenantId).case.findFirst({
      where: { id: caseId, deletedAt: null },
      select: { id: true },
    });
    if (!caseExists) throw new NotFoundException(`Case ${caseId} not found`);

    return this.prisma.forTenant(tenantId).caseNote.create({
      data: { tenantId, caseId, authorId, body: dto.body },
    });
  }

  findByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).caseNote.findMany({
      where: { caseId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async softDelete(tenantId: string, noteId: string) {
    const note = await this.prisma.forTenant(tenantId).caseNote.findFirst({
      where: { id: noteId, deletedAt: null },
    });
    if (!note) throw new NotFoundException(`Note ${noteId} not found`);
    return this.prisma.forTenant(tenantId).caseNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });
  }
}
