import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  formatZonedIso,
  getIsoWeekday,
  localMinuteToUtc,
  parseLocalDate,
} from './date-time.js';
import { GetAvailabilityQueryDto } from './dto/get-availability-query.dto.js';

const SLOT_STEP_MINUTES = 30;
const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

type BusyInterval = {
  workPostId: number;
  startsAt: Date;
  endsAt: Date;
};

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableSlots(query: GetAvailabilityQueryDto) {
    const localDate = parseLocalDate(query.date);
    if (!localDate) {
      throw new BadRequestException('Указана некорректная дата');
    }

    const offer = await this.prisma.stationService.findFirst({
      where: {
        stationId: query.stationId,
        serviceId: query.serviceId,
        isActive: true,
        station: { isActive: true },
        service: { isActive: true },
      },
      select: {
        durationMinutes: true,
        station: { select: { timezone: true } },
        workPosts: {
          where: {
            workPost: {
              isActive: true,
              type: { isActive: true },
            },
          },
          select: { workPostId: true },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Услуга недоступна в выбранном филиале');
    }

    const baseResponse = {
      stationId: query.stationId,
      serviceId: query.serviceId,
      date: query.date,
      timezone: offer.station.timezone,
      durationMinutes: offer.durationMinutes,
      slotStepMinutes: SLOT_STEP_MINUTES,
    };

    const workPostIds = offer.workPosts.map(({ workPostId }) => workPostId);
    if (workPostIds.length === 0) {
      return { ...baseResponse, slots: [] };
    }

    const [exception, weeklyPeriods] = await Promise.all([
      this.prisma.stationScheduleException.findUnique({
        where: {
          stationId_date: {
            stationId: query.stationId,
            date: localDate.date,
          },
        },
        select: {
          isClosed: true,
          startsMinute: true,
          endsMinute: true,
        },
      }),
      this.prisma.stationWorkingPeriod.findMany({
        where: {
          stationId: query.stationId,
          weekday: getIsoWeekday(localDate.date),
        },
        orderBy: { startsMinute: 'asc' },
        select: { startsMinute: true, endsMinute: true },
      }),
    ]);

    const periods = exception
      ? exception.isClosed
        ? []
        : [
            {
              startsMinute: exception.startsMinute!,
              endsMinute: exception.endsMinute!,
            },
          ]
      : weeklyPeriods;

    if (periods.length === 0) {
      return { ...baseResponse, slots: [] };
    }

    const rangeStart = localMinuteToUtc(
      localDate,
      Math.min(...periods.map(({ startsMinute }) => startsMinute)),
      offer.station.timezone,
    );
    const rangeEnd = localMinuteToUtc(
      localDate,
      Math.max(...periods.map(({ endsMinute }) => endsMinute)),
      offer.station.timezone,
    );
    const now = new Date();

    if (rangeEnd <= now) {
      return { ...baseResponse, slots: [] };
    }

    const [bookings, downtimes] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          workPostId: { in: workPostIds },
          status: { in: ACTIVE_BOOKING_STATUSES },
          startsAt: { lt: rangeEnd },
          endsAt: { gt: rangeStart },
        },
        select: { workPostId: true, startsAt: true, endsAt: true },
      }),
      this.prisma.workPostDowntime.findMany({
        where: {
          workPostId: { in: workPostIds },
          startsAt: { lt: rangeEnd },
          endsAt: { gt: rangeStart },
        },
        select: { workPostId: true, startsAt: true, endsAt: true },
      }),
    ]);

    const busyByPost = this.groupBusyIntervals([...bookings, ...downtimes]);
    const slots = new Map<string, { startsAt: string; endsAt: string }>();

    for (const period of periods) {
      for (
        let minute = period.startsMinute;
        minute + offer.durationMinutes <= period.endsMinute;
        minute += SLOT_STEP_MINUTES
      ) {
        const startsAt = localMinuteToUtc(
          localDate,
          minute,
          offer.station.timezone,
        );
        const endsAt = localMinuteToUtc(
          localDate,
          minute + offer.durationMinutes,
          offer.station.timezone,
        );

        if (startsAt <= now) continue;

        const hasFreePost = workPostIds.some((workPostId) =>
          (busyByPost.get(workPostId) ?? []).every(
            (busy) => startsAt >= busy.endsAt || endsAt <= busy.startsAt,
          ),
        );

        if (hasFreePost) {
          const slot = {
            startsAt: formatZonedIso(startsAt, offer.station.timezone),
            endsAt: formatZonedIso(endsAt, offer.station.timezone),
          };
          slots.set(`${slot.startsAt}/${slot.endsAt}`, slot);
        }
      }
    }

    return { ...baseResponse, slots: [...slots.values()] };
  }

  private groupBusyIntervals(intervals: BusyInterval[]) {
    const result = new Map<number, BusyInterval[]>();

    for (const interval of intervals) {
      const existing = result.get(interval.workPostId) ?? [];
      existing.push(interval);
      result.set(interval.workPostId, existing);
    }

    return result;
  }
}
