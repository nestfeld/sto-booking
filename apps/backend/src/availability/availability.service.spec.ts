import { BadRequestException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AvailabilityService } from './availability.service.js';

describe('AvailabilityService', () => {
  const findOffer = vi.fn();
  const findException = vi.fn();
  const findPeriods = vi.fn();
  const findBookings = vi.fn();
  const findDowntimes = vi.fn();
  const prisma = {
    stationService: { findFirst: findOffer },
    stationScheduleException: { findUnique: findException },
    stationWorkingPeriod: { findMany: findPeriods },
    booking: { findMany: findBookings },
    workPostDowntime: { findMany: findDowntimes },
  } as unknown as PrismaService;
  const service = new AvailabilityService(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
    findOffer.mockResolvedValue({
      durationMinutes: 60,
      station: { timezone: 'UTC' },
      workPosts: [{ workPostId: 1 }, { workPostId: 2 }],
    });
    findException.mockResolvedValue(null);
    findPeriods.mockResolvedValue([{ startsMinute: 540, endsMinute: 660 }]);
    findBookings.mockResolvedValue([]);
    findDowntimes.mockResolvedValue([]);
  });

  it('returns slots when at least one compatible post is free', async () => {
    findBookings.mockResolvedValue([
      {
        workPostId: 1,
        startsAt: new Date('2030-10-15T09:00:00Z'),
        endsAt: new Date('2030-10-15T10:00:00Z'),
      },
    ]);
    findDowntimes.mockResolvedValue([
      {
        workPostId: 2,
        startsAt: new Date('2030-10-15T10:00:00Z'),
        endsAt: new Date('2030-10-15T10:30:00Z'),
      },
    ]);

    const result = await service.findAvailableSlots({
      stationId: 1,
      serviceId: 1,
      date: '2030-10-15',
    });

    expect(result.slots).toEqual([
      {
        startsAt: '2030-10-15T09:00:00+00:00',
        endsAt: '2030-10-15T10:00:00+00:00',
      },
      {
        startsAt: '2030-10-15T10:00:00+00:00',
        endsAt: '2030-10-15T11:00:00+00:00',
      },
    ]);
  });

  it('returns no slots on a closed exception date', async () => {
    findException.mockResolvedValue({
      isClosed: true,
      startsMinute: null,
      endsMinute: null,
    });

    const result = await service.findAvailableSlots({
      stationId: 1,
      serviceId: 1,
      date: '2030-10-15',
    });

    expect(result.slots).toEqual([]);
    expect(findBookings).not.toHaveBeenCalled();
    expect(findDowntimes).not.toHaveBeenCalled();
  });

  it('throws when the station does not offer the service', async () => {
    findOffer.mockResolvedValue(null);

    await expect(
      service.findAvailableSlots({
        stationId: 1,
        serviceId: 999,
        date: '2026-10-13',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not return slots from a past date', async () => {
    const result = await service.findAvailableSlots({
      stationId: 1,
      serviceId: 1,
      date: '2020-10-13',
    });

    expect(result.slots).toEqual([]);
    expect(findBookings).not.toHaveBeenCalled();
    expect(findDowntimes).not.toHaveBeenCalled();
  });

  it('rejects a calendar date that does not exist', async () => {
    await expect(
      service.findAvailableSlots({
        stationId: 1,
        serviceId: 1,
        date: '2026-02-30',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
