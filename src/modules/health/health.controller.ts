import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

type RedisState = 'ok' | 'disabled' | 'error';

// Isolated function so TypeScript cannot narrow to a literal — Phase 8 wires real ping here
function getRedisState(): RedisState {
  if (!process.env.REDIS_URL) return 'disabled';
  // TODO Phase 8: create Redis client and ping; return 'ok' or 'error'
  return 'disabled';
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check — reports DB and Redis connectivity' })
  @ApiResponse({ status: 200, description: 'Returns status, db, and redis states' })
  async health(): Promise<{ status: 'ok' | 'degraded'; db: string; redis: RedisState }> {
    let db: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }

    const redis = getRedisState();
    const healthy = db === 'ok' && redis !== 'error';
    return { status: healthy ? 'ok' : 'degraded', db, redis };
  }
}
