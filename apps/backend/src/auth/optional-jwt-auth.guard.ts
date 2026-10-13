import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  constructor(jwtService: JwtService, authService: AuthService) {
    super(jwtService, authService);
  }

  override async canActivate(context: ExecutionContext) {
    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof UnauthorizedException) return true;
      throw error;
    }
  }
}
