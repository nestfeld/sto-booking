import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthCredentialsDto } from './dto/auth-credentials.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AuthTokenPayload, AuthUser } from './auth.types.js';

const PASSWORD_HASH_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(credentials: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { login: credentials.login },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким логином уже существует',
      );
    }

    const passwordHash = await hash(credentials.password, PASSWORD_HASH_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          login: credentials.login,
          name: credentials.name,
          phone: credentials.phone,
          passwordHash,
        },
        select: {
          id: true,
          login: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      return {
        user,
        accessToken: await this.createToken(user),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Пользователь с таким логином уже существует',
        );
      }

      throw error;
    }
  }

  async login(credentials: AuthCredentialsDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: credentials.login },
      select: {
        id: true,
        login: true,
        name: true,
        phone: true,
        role: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user || !(await compare(credentials.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const publicUser = {
      id: user.id,
      login: user.login,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };

    return {
      user: publicUser,
      accessToken: await this.createToken(publicUser),
    };
  }

  async findUser(id: number): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        login: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }

  updateProfile(id: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        login: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }

  private createToken(user: AuthUser) {
    const payload: AuthTokenPayload = { sub: user.id, login: user.login };
    return this.jwtService.signAsync(payload);
  }
}
