import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_INTERNAL_KEY } from '../decorators/internal-only.decorator';

@Injectable()
export class InternalOnlyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isInternal = this.reflector.getAllAndOverride<boolean>(IS_INTERNAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isInternal) return true; // Not an @InternalOnly() route — let other guards handle

    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-vigil-internal-key'] as string | undefined;
    const expected = this.configService.get<string>('INTERNAL_API_KEY');
    if (!expected || key !== expected) {
      throw new UnauthorizedException('Invalid internal key');
    }
    return true;
  }
}
