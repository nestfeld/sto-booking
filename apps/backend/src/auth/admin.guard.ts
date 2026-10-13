import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступ разрешён только администратору');
    }

    return true;
  }
}
