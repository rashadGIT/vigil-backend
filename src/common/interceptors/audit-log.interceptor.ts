import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

const METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.create,
  PATCH: AuditAction.update,
  PUT: AuditAction.update,
  DELETE: AuditAction.delete,
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const action = METHOD_TO_ACTION[request.method as string];
    if (!action) return next.handle(); // GET / HEAD — don't audit

    return next.handle().pipe(
      tap(async (responseBody: unknown) => {
        const user = request.user as
          | { sub?: string; tenantId?: string }
          | undefined;
        if (!user?.sub || !user.tenantId) return;

        const entityType = this.deriveEntityType(
          request.route?.path ?? request.url,
        );
        const entityId =
          (responseBody as { id?: string } | null)?.id ??
          (request.params?.id as string | undefined) ??
          'unknown';

        try {
          await this.prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              userId: user.sub,
              action,
              entityType,
              entityId,
              ipAddress: (request.ip as string | undefined) ?? null,
            },
          });
        } catch (err) {
          this.logger.warn(
            `Failed to write AuditLog: ${(err as Error).message}`,
          );
        }
      }),
    );
  }

  private deriveEntityType(path: string): string {
    // "/cases/:id/tasks" → "tasks"; "/cases/:id" → "cases"
    const segments = path.split('/').filter((s) => s && !s.startsWith(':'));
    return segments[segments.length - 1] ?? 'unknown';
  }
}
