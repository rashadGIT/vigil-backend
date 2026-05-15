import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePreneedDto } from './dto/create-preneed.dto';
import { UpdatePreneedDto } from './dto/update-preneed.dto';

@Injectable()
export class PreneedService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreatePreneedDto) {
    return this.prisma.forTenant(tenantId).preneedArrangement.create({
      data: {
        tenantId,
        clientFirstName: dto.clientFirstName,
        clientLastName: dto.clientLastName,
        clientDob: dto.clientDob ? new Date(dto.clientDob) : null,
        clientPhone: dto.clientPhone ?? null,
        clientEmail: dto.clientEmail ?? null,
        clientAddress: dto.clientAddress ?? null,
        fundingType: dto.fundingType ?? null,
        policyNumber: dto.policyNumber ?? null,
        insuranceCompany: dto.insuranceCompany ?? null,
        faceValue: dto.faceValue ?? null,
        serviceType: dto.serviceType,
        servicePreferences: dto.servicePreferences ?? {},
        notes: dto.notes ?? null,
      },
    });
  }

  findAll(tenantId: string, status?: string) {
    return this.prisma.forTenant(tenantId).preneedArrangement.findMany({
      where: { ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const arrangement = await this.prisma
      .forTenant(tenantId)
      .preneedArrangement.findFirst({ where: { id } });
    if (!arrangement) {
      throw new NotFoundException(`Pre-need arrangement ${id} not found`);
    }
    return arrangement;
  }

  async update(tenantId: string, id: string, dto: UpdatePreneedDto) {
    await this.findOne(tenantId, id);
    return this.prisma.forTenant(tenantId).preneedArrangement.update({
      where: { id },
      data: {
        ...dto,
        clientDob: dto.clientDob ? new Date(dto.clientDob) : undefined,
        servicePreferences: dto.servicePreferences as object | undefined,
      },
    });
  }

  async convert(tenantId: string, id: string) {
    const arrangement = await this.findOne(tenantId, id);

    if (arrangement.status === 'converted') {
      throw new BadRequestException(`Arrangement ${id} is already converted`);
    }
    if (arrangement.status === 'cancelled') {
      throw new BadRequestException(
        `Arrangement ${id} is cancelled and cannot be converted`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const newCase = await tx.case.create({
        data: {
          tenantId,
          deceasedName: `${arrangement.clientFirstName} ${arrangement.clientLastName}`,
          serviceType: arrangement.serviceType,
          status: 'new',
        },
      });

      const updated = await tx.preneedArrangement.update({
        where: { id },
        data: {
          convertedCaseId: newCase.id,
          convertedAt: new Date(),
          status: 'converted',
        },
      });

      return { arrangement: updated, case: newCase };
    });
  }
}
