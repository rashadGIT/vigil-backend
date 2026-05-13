import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

interface ImpersonationToken {
  tenantId: string;
  role: 'funeral_director';
  exp: number;
}

@Injectable()
export class SuperAdminService {
  // In-memory store for short-lived impersonation tokens (support use only)
  private readonly impersonationTokens = new Map<string, ImpersonationToken>();

  constructor(private readonly prisma: PrismaService) {}

  listTenants() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        planTier: true,
        active: true,
        createdAt: true,
        _count: { select: { users: true, cases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTenant(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.slug }, { subdomain: dto.slug }] },
    });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        subdomain: dto.slug,
        planTier: dto.planTier ?? 'pilot',
        active: true,
      },
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.planTier !== undefined && { planTier: dto.planTier }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async getTenantCases(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    // Cross-tenant query — intentionally bypasses forTenant(); super_admin only
    return this.prisma.case.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        deceasedName: true,
        status: true,
        stage: true,
        serviceType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createImpersonationToken(tenantId: string): Promise<{ token: string; expiresAt: string }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    if (!tenant.active) throw new ConflictException(`Tenant ${tenantId} is inactive`);

    const token = randomBytes(32).toString('hex');
    const exp = Date.now() + 60 * 60 * 1000; // 1 hour
    this.impersonationTokens.set(token, { tenantId, role: 'funeral_director', exp });

    // Clean up expired tokens opportunistically
    for (const [k, v] of this.impersonationTokens) {
      if (v.exp < Date.now()) this.impersonationTokens.delete(k);
    }

    return { token, expiresAt: new Date(exp).toISOString() };
  }

  resolveImpersonationToken(token: string): ImpersonationToken | null {
    const record = this.impersonationTokens.get(token);
    if (!record) return null;
    if (record.exp < Date.now()) {
      this.impersonationTokens.delete(token);
      return null;
    }
    return record;
  }
}
