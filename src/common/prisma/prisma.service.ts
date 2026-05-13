import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Models that do NOT have a tenantId column — forTenant() must skip them
const UNSCOPED_MODELS = new Set<string>(['Tenant']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Returns a tenant-scoped Prisma client. Every service method MUST call this
   * instead of `this.prisma` when querying tenant-owned data.
   *
   * - Injects `tenantId` into `where` clauses on all operations
   * - Injects `tenantId` into `data` on single-record creates
   * - Skips the Tenant model itself (no tenantId column)
   */
  forTenant(tenantId: string) {
    if (!tenantId) {
      throw new Error('forTenant() called without tenantId — refuse to run unscoped query');
    }
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (UNSCOPED_MODELS.has(model)) {
              return query(args);
            }
            const a = args as Record<string, unknown>;
            if ('where' in a && a.where && typeof a.where === 'object') {
              a.where = { ...(a.where as object), tenantId };
            } else if (
              ['findFirst', 'findMany', 'findUnique', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate'].includes(operation)
            ) {
              a.where = { tenantId };
            }
            if ('data' in a && a.data && !Array.isArray(a.data) && typeof a.data === 'object') {
              a.data = { ...(a.data as object), tenantId };
            }
            return query(args);
          },
        },
      },
    });
  }
}
