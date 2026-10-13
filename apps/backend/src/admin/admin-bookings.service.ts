import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListAdminBookingsQueryDto } from './dto/list-admin-bookings-query.dto.js';

const ADMIN_BOOKING_SELECT = {
  id: true,
  userId: true,
  customerName: true,
  phone: true,
  vehicle: true,
  startsAt: true,
  endsAt: true,
  durationMinutes: true,
  priceAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      login: true,
      name: true,
      phone: true,
    },
  },
  workPostService: {
    select: {
      workPost: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      stationService: {
        select: {
          station: {
            select: {
              id: true,
              name: true,
              address: true,
              timezone: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.BookingSelect;

type AdminBookingRecord = Prisma.BookingGetPayload<{
  select: typeof ADMIN_BOOKING_SELECT;
}>;

const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  CONFIRMED: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  IN_PROGRESS: [BookingStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class AdminBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListAdminBookingsQueryDto) {
    const startsAt: Prisma.DateTimeFilter = {};

    if (query.from) startsAt.gte = new Date(query.from);
    if (query.to) startsAt.lt = new Date(query.to);

    if (
      startsAt.gte instanceof Date &&
      startsAt.lt instanceof Date &&
      startsAt.gte >= startsAt.lt
    ) {
      throw new BadRequestException(
        'Конечная дата должна быть позже начальной',
      );
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.stationId ? { stationId: query.stationId } : {}),
        ...(Object.keys(startsAt).length > 0 ? { startsAt } : {}),
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      select: ADMIN_BOOKING_SELECT,
    });

    return bookings.map((booking) => this.toResponse(booking));
  }

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: ADMIN_BOOKING_SELECT,
    });

    if (!booking) {
      throw new NotFoundException('Запись не найдена');
    }

    return this.toResponse(booking);
  }

  async updateStatus(id: number, nextStatus: BookingStatus) {
    const current = await this.prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!current) {
      throw new NotFoundException('Запись не найдена');
    }

    if (current.status === nextStatus) {
      return this.findOne(id);
    }

    if (!allowedTransitions[current.status].includes(nextStatus)) {
      throw new BadRequestException(
        `Нельзя изменить статус ${current.status} на ${nextStatus}`,
      );
    }

    const result = await this.prisma.booking.updateMany({
      where: { id, status: current.status },
      data: { status: nextStatus },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Статус записи уже изменился. Обновите список и повторите действие',
      );
    }

    return this.findOne(id);
  }

  private toResponse(booking: AdminBookingRecord) {
    const { workPostService, ...data } = booking;

    return {
      ...data,
      station: workPostService.stationService.station,
      service: workPostService.stationService.service,
      workPost: workPostService.workPost,
    };
  }
}
