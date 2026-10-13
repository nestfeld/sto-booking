import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_TTL_SECONDS,
  isSecureCookie,
} from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { AuthCredentialsDto } from './dto/auth-credentials.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const credentialsPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body(credentialsPipe) credentials: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(credentials);
    this.setAuthCookie(response, result.accessToken);
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(credentialsPipe) credentials: AuthCredentialsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(credentials);
    this.setAuthCookie(response, result.accessToken);
    return { user: result.user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body(credentialsPipe) dto: UpdateProfileDto,
  ) {
    return {
      user: await this.authService.updateProfile(request.user.id, dto),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, this.cookieOptions());
  }

  private setAuthCookie(response: Response, token: string) {
    response.cookie(AUTH_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isSecureCookie(),
      path: '/',
    };
  }
}
