import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AUTH_TOKEN_TTL_SECONDS, getJwtSecret } from './auth.constants.js';
import { AdminGuard } from './admin.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: AUTH_TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard],
  exports: [
    JwtModule,
    AuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    AdminGuard,
  ],
})
export class AuthModule {}
