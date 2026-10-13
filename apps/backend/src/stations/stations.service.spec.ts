import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { StationsService } from './stations.service.js';

describe('StationsService', () => {
  const findMany = vi.fn();
  const findFirst = vi.fn();
  const prisma = {
    station: { findMany, findFirst },
  } as unknown as PrismaService;
  const service = new StationsService(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active stations with service count', async () => {
    findMany.mockResolvedValue([
      {
        id: 1,
        slug: 'center',
        name: 'M1 Центр',
        address: 'Адрес',
        phone: null,
        timezone: 'Asia/Qyzylorda',
        services: [{ serviceId: 1 }, { serviceId: 2 }],
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({ id: 1, serviceCount: 2 }),
    ]);
  });

  it('throws when station does not exist', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
