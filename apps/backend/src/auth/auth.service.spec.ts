import { ConflictException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const findUnique = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const signAsync = vi.fn().mockResolvedValue('signed-token');
  const prisma = {
    user: { findUnique, create, update },
  } as unknown as PrismaService;
  const jwtService = { signAsync } as unknown as JwtService;
  const service = new AuthService(prisma, jwtService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a user with a hashed password', async () => {
    findUnique.mockResolvedValue(null);
    create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 1,
        login: data.login,
        name: data.name,
        phone: data.phone,
        role: 'CLIENT',
        createdAt: new Date('2030-01-01T00:00:00Z'),
        passwordHash: data.passwordHash,
      }),
    );

    const result = await service.register({
      login: 'client',
      password: 'strong-password',
      name: 'Иван',
      phone: 'примерный номер',
    });

    const savedHash = create.mock.calls[0][0].data.passwordHash as string;
    expect(savedHash).not.toBe('strong-password');
    await expect(compare('strong-password', savedHash)).resolves.toBe(true);
    expect(result.accessToken).toBe('signed-token');
  });

  it('rejects an already registered login', async () => {
    findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.register({
        login: 'client',
        password: 'strong-password',
        name: 'Иван',
        phone: '+7 700 000 00 00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not reveal whether login or password is incorrect', async () => {
    findUnique.mockResolvedValue({
      id: 1,
      login: 'client',
      name: 'Иван',
      phone: '+7 700 000 00 00',
      role: 'CLIENT',
      passwordHash: await hash('correct-password', 4),
      createdAt: new Date('2030-01-01T00:00:00Z'),
    });

    await expect(
      service.login({ login: 'client', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      message: 'Неверный логин или пароль',
    });
  });

  it('updates editable profile fields', async () => {
    update.mockResolvedValue({
      id: 1,
      login: 'client',
      name: 'Анна',
      phone: '+7 777 555 44 33',
      role: 'CLIENT',
      createdAt: new Date('2030-01-01T00:00:00Z'),
    });

    await expect(
      service.updateProfile(1, {
        name: 'Анна',
        phone: '+7 777 555 44 33',
      }),
    ).resolves.toMatchObject({ name: 'Анна', phone: '+7 777 555 44 33' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { name: 'Анна', phone: '+7 777 555 44 33' },
      }),
    );
  });
});
