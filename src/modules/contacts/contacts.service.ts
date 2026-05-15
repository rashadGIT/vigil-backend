import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, caseId: string, dto: CreateContactDto) {
    return this.prisma.forTenant(tenantId).familyContact.create({
      data: { ...dto, caseId, tenantId },
    });
  }

  findByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).familyContact.findMany({
      where: { caseId },
      orderBy: { isPrimaryContact: 'desc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto) {
    const existing = await this.prisma
      .forTenant(tenantId)
      .familyContact.findFirst({
        where: { id },
      });
    if (!existing) throw new NotFoundException(`Contact ${id} not found`);
    return this.prisma
      .forTenant(tenantId)
      .familyContact.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma
      .forTenant(tenantId)
      .familyContact.findFirst({
        where: { id },
      });
    if (!existing) throw new NotFoundException(`Contact ${id} not found`);
    return this.prisma
      .forTenant(tenantId)
      .familyContact.delete({ where: { id } });
  }
}
