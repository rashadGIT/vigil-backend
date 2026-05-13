import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_INTERNAL_KEY } from '../decorators/internal-only.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SUPER_ADMIN_ONLY_KEY } from '../decorators/super-admin-only.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isInternal = this.reflector.getAllAndOverride<boolean>(IS_INTERNAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isInternal) return true;

    const { user } = context.switchToHttp().getRequest<{ user: { role: string } }>();
    if (!user) throw new ForbiddenException('No authenticated user');

    // @SuperAdminOnly() — only Vigil support accounts
    const isSuperAdminOnly = this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isSuperAdminOnly) {
      if (user.role !== 'super_admin') throw new ForbiddenException('Super admin access required');
      return true;
    }

    // super_admin bypasses all @Roles() checks
    if (user.role === 'super_admin') return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — allow any authenticated user through
    if (!requiredRoles || requiredRoles.length === 0) return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
