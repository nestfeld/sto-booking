import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest, AuthTokenPayload } from './auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.getCookie(request.headers.cookie, AUTH_COOKIE_NAME);

    if (!token) {
      throw new UnauthorizedException('Требуется авторизация');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AuthTokenPayload>(token);
      const user = await this.authService.findUser(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Сессия недействительна или истекла');
    }
  }

  private getCookie(header: string | undefined, name: string) {
    if (!header) return null;

    for (const part of header.split(';')) {
      const [cookieName, ...valueParts] = part.trim().split('=');
      if (cookieName === name) {
        return decodeURIComponent(valueParts.join('='));
      }
    }

    return null;
  }
}
