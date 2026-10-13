import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { vi } from 'vitest';
import { AvailabilityService } from '../availability/availability.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BookingsService } from './bookings.service.js';
import type { CreateBookingDto } from './dto/create-booking.dto.js';

describe('BookingsService', () => {
  const findOffer = vi.fn();
  const findCandidates = vi.fn();
  const findUser = vi.fn();
  const findVehicle = vi.fn();
  const findBookings = vi.fn();
  const insertBooking = vi.fn();
  const findAvailableSlots = vi.fn();
  const prisma = {
    stationService: { findFirst: findOffer },
    workPost: { findMany: findCandidates },
    user: { findUnique: findUser },
    vehicle: { findFirst: findVehicle },
    booking: { findMany: findBookings },
    $queryRaw: insertBooking,
  } as unknown as PrismaService;
  const availabilityService = {
    findAvailableSlots,
  } as unknown as AvailabilityService;
  const service = new BookingsService(prisma, availabilityService);
  const dto: CreateBookingDto = {
    stationId: 1,
    serviceId: 2,
    startsAt: '2035-10-15T09:00:00Z',
    customerName: 'Иван Петров',
    phone: '+7 700 000 00 00',
    vehicle: 'Toyota Camry',
  };
  const createdBooking = {
    id: 10,
    stationId: 1,
    serviceId: 2,
    customerName: dto.customerName,
    phone: dto.phone,
    vehicle: dto.vehicle,
    startsAt: new Date(dto.startsAt),
    endsAt: new Date('2035-10-15T10:00:00Z'),
    durationMinutes: 60,
    priceAmount: 12_000,
    status: BookingStatus.PENDING,
    createdAt: new Date('2035-10-01T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    findOffer.mockResolvedValue({
      durationMinutes: 60,
      priceFrom: 12_000,
      station: { timezone: 'UTC' },
      workPosts: [{ workPostId: 11 }, { workPostId: 12 }],
    });
    findAvailableSlots.mockResolvedValue({
      slots: [
        {
          startsAt: '2035-10-15T09:00:00+00:00',
          endsAt: '2035-10-15T10:00:00+00:00',
        },
      ],
    });
    findCandidates.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    findUser.mockResolvedValue({
      name: 'Иван из профиля',
      phone: '+7 777 111 22 33',
    });
    findVehicle.mockResolvedValue({ id: 7, name: 'BMW X5, 2024' });
    insertBooking.mockResolvedValue([createdBooking]);
    findBookings.mockResolvedValue([]);
  });

  it('returns only the current user bookings with public visit details', async () => {
    findBookings.mockResolvedValue([
      {
        id: 4,
        vehicle: 'Toyota Camry',
        startsAt: new Date('2035-10-15T09:00:00Z'),
        endsAt: new Date('2035-10-15T10:00:00Z'),
        durationMinutes: 60,
        priceAmount: 12_000,
        status: BookingStatus.CONFIRMED,
        createdAt: new Date('2035-10-01T00:00:00Z'),
        workPostService: {
          stationService: {
            station: {
              id: 1,
              name: 'M1 Центр',
              address: 'проспект Абая, 1',
              timezone: 'Asia/Qyzylorda',
            },
            service: { id: 2, name: 'Диагностика' },
          },
        },
      },
    ]);

    await expect(service.findMine(42)).resolves.toEqual([
      expect.objectContaining({
        id: 4,
        station: expect.objectContaining({ name: 'M1 Центр' }),
        service: { id: 2, name: 'Диагностика' },
      }),
    ]);
    expect(findBookings).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 42 } }),
    );
  });

  it('creates a booking on a compatible free post', async () => {
    await expect(service.create(dto, 42)).resolves.toEqual(createdBooking);

    expect(findAvailableSlots).toHaveBeenCalledWith({
      stationId: 1,
      serviceId: 2,
      date: '2035-10-15',
    });
    expect(findCandidates).toHaveBeenCalledOnce();
    expect(insertBooking).toHaveBeenCalledOnce();
  });

  it('uses account contacts and a saved vehicle for an authenticated user', async () => {
    await service.create(
      {
        stationId: dto.stationId,
        serviceId: dto.serviceId,
        startsAt: dto.startsAt,
        vehicleId: 7,
      },
      42,
    );

    expect(findVehicle).toHaveBeenCalledWith({
      where: { id: 7, userId: 42 },
      select: { id: true, name: true },
    });
    const query = insertBooking.mock.calls[0][0] as { values: unknown[] };
    expect(query.values).toEqual(
      expect.arrayContaining([
        42,
        7,
        'Иван из профиля',
        '+7 777 111 22 33',
        'BMW X5, 2024',
      ]),
    );
  });

  it('tries the next post when a concurrent insert takes the first one', async () => {
    insertBooking
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdBooking]);

    await expect(service.create(dto)).resolves.toEqual(createdBooking);
    expect(insertBooking).toHaveBeenCalledTimes(2);
  });

  it('rejects a slot that is no longer available', async () => {
    findAvailableSlots.mockResolvedValue({ slots: [] });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(findCandidates).not.toHaveBeenCalled();
  });

  it('rejects an unavailable station service', async () => {
    findOffer.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a time in the past', async () => {
    await expect(
      service.create({
        stationId: dto.stationId,
        serviceId: dto.serviceId,
        startsAt: '2020-10-15T09:00:00Z',
        customerName: dto.customerName,
        phone: dto.phone,
        vehicle: dto.vehicle,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findOffer).not.toHaveBeenCalled();
  });

  it('returns a conflict when every compatible post was taken concurrently', async () => {
    insertBooking.mockResolvedValue([]);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(insertBooking).toHaveBeenCalledTimes(2);
  });
});
