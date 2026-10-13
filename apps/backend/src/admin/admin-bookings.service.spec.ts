import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminBookingsService } from './admin-bookings.service.js';

describe('AdminBookingsService', () => {
  const findMany = vi.fn();
  const findUnique = vi.fn();
  const updateMany = vi.fn();
  const prisma = {
    booking: { findMany, findUnique, updateMany },
  } as unknown as PrismaService;
  const service = new AdminBookingsService(prisma);
  const booking = {
    id: 12,
    userId: 4,
    customerName: 'Иван',
    phone: '+7 700 000 00 00',
    vehicle: 'Toyota Camry',
    startsAt: new Date('2035-10-15T09:00:00Z'),
    endsAt: new Date('2035-10-15T10:00:00Z'),
    durationMinutes: 60,
    priceAmount: 12_000,
    status: BookingStatus.PENDING,
    createdAt: new Date('2035-10-01T00:00:00Z'),
    updatedAt: new Date('2035-10-01T00:00:00Z'),
    user: {
      id: 4,
      login: 'client',
      name: 'Иван',
      phone: '+7 700 000 00 00',
    },
    workPostService: {
      workPost: { id: 5, code: 'D-01', name: 'Диагностический пост' },
      stationService: {
        station: {
          id: 1,
          name: 'M1 Центр',
          address: 'проспект Абая, 125',
          timezone: 'Asia/Qyzylorda',
        },
        service: { id: 2, name: 'Диагностика' },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([booking]);
    updateMany.mockResolvedValue({ count: 1 });
  });

  it('returns flattened booking details for the administration panel', async () => {
    await expect(service.findAll({})).resolves.toEqual([
      expect.objectContaining({
        id: 12,
        station: expect.objectContaining({ name: 'M1 Центр' }),
        service: { id: 2, name: 'Диагностика' },
        workPost: expect.objectContaining({ code: 'D-01' }),
      }),
    ]);
  });

  it('changes a booking only through an allowed status transition', async () => {
    findUnique
      .mockResolvedValueOnce({ id: 12, status: BookingStatus.PENDING })
      .mockResolvedValueOnce({
        ...booking,
        status: BookingStatus.CONFIRMED,
      });

    await expect(
      service.updateStatus(12, BookingStatus.CONFIRMED),
    ).resolves.toMatchObject({ id: 12, status: BookingStatus.CONFIRMED });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 12, status: BookingStatus.PENDING },
      data: { status: BookingStatus.CONFIRMED },
    });
  });

  it('rejects an invalid status transition', async () => {
    findUnique.mockResolvedValue({
      id: 12,
      status: BookingStatus.COMPLETED,
    });

    await expect(
      service.updateStatus(12, BookingStatus.PENDING),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
