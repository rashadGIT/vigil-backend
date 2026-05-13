import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Local-dev cron stubs. PRODUCTION GUARD on every method.
 * n8n Workflow 1 (Phase 9) replaces these entirely.
 */
@Injectable()
export class CronStubsService {
  private readonly logger = new Logger(CronStubsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async logPendingFollowUps(): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;
    try {
      const pending = await this.prisma.followUp.count({ where: { status: 'pending' } });
      this.logger.log(
        `[CRON STUB] ${pending} follow-ups pending — configure n8n Workflow 1 (Phase 9) to send real emails`,
      );
    } catch (err) {
      this.logger.warn(`Cron stub DB check failed: ${(err as Error).message}`);
    }
  }
}
