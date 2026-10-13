import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { ServicesService } from './services.service.js';

describe('ServicesService', () => {
  const findMany = vi.fn();
  const findFirst = vi.fn();
  const prisma = {
    service: { findMany, findFirst },
  } as unknown as PrismaService;
  const service = new ServicesService(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active services with station count', async () => {
    findMany.mockResolvedValue([
      {
        id: 1,
        slug: 'diagnostics',
        name: 'Диагностика',
        description: 'Описание',
        category: 'Диагностика',
        durationMinutes: 45,
        priceFrom: 8000,
        stations: [{ stationId: 1 }, { stationId: 2 }],
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({ id: 1, stationCount: 2 }),
    ]);
  });

  it('throws when service does not exist', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
