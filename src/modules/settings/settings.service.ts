import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return { name: tenant.name, googleReviewUrl: tenant.googleReviewUrl };
  }

  async update(tenantId: string, dto: UpdateSettingsDto) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.googleReviewUrl !== undefined ? { googleReviewUrl: dto.googleReviewUrl } : {}),
      },
    });
    return { name: tenant.name, googleReviewUrl: tenant.googleReviewUrl };
  }
}
