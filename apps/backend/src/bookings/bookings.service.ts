import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { AvailabilityService } from '../availability/availability.service.js';
import { formatLocalDate } from '../availability/date-time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

type CreatedBooking = {
  id: number;
  stationId: number;
  serviceId: number;
  vehicleId: number | null;
  customerName: string;
  phone: string;
  vehicle: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  priceAmount: number | null;
  status: BookingStatus;
  createdAt: Date;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async findMine(userId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        vehicle: true,
        startsAt: true,
        endsAt: true,
        durationMinutes: true,
        priceAmount: true,
        status: true,
        createdAt: true,
        workPostService: {
          select: {
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
      },
    });

    return bookings.map(({ workPostService, ...booking }) => ({
      ...booking,
      station: workPostService.stationService.station,
      service: workPostService.stationService.service,
    }));
  }

  async create(dto: CreateBookingDto, userId?: number) {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Указано некорректное время записи');
    }

    if (startsAt <= new Date()) {
      throw new BadRequestException('Время записи должно быть в будущем');
    }

    const customer = await this.resolveCustomer(dto, userId);

    const offer = await this.prisma.stationService.findFirst({
      where: {
        stationId: dto.stationId,
        serviceId: dto.serviceId,
        isActive: true,
        station: { isActive: true },
        service: { isActive: true },
      },
      select: {
        durationMinutes: true,
        priceFrom: true,
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

    if (offer.workPosts.length === 0) {
      throw new ConflictException(
        'Для этой услуги нет доступных рабочих постов',
      );
    }

    const availability = await this.availabilityService.findAvailableSlots({
      stationId: dto.stationId,
      serviceId: dto.serviceId,
      date: formatLocalDate(startsAt, offer.station.timezone),
    });
    const selectedSlot = availability.slots.find(
      (slot) => new Date(slot.startsAt).getTime() === startsAt.getTime(),
    );

    if (!selectedSlot) {
      throw new ConflictException('Выбранное время уже недоступно');
    }

    const endsAt = new Date(selectedSlot.endsAt);
    const compatiblePostIds = offer.workPosts.map(
      ({ workPostId }) => workPostId,
    );
    const candidates = await this.prisma.workPost.findMany({
      where: {
        id: { in: compatiblePostIds },
        stationId: dto.stationId,
        isActive: true,
        type: { isActive: true },
        downtimes: {
          none: {
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        },
        services: {
          some: {
            stationId: dto.stationId,
            serviceId: dto.serviceId,
            bookings: {
              none: {
                status: { in: ACTIVE_BOOKING_STATUSES },
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    for (const candidate of candidates) {
      const bookings = await this.prisma.$queryRaw<CreatedBooking[]>(Prisma.sql`
        INSERT INTO "Booking" (
          "userId",
          "vehicleId",
          "stationId",
          "serviceId",
          "workPostId",
          "customerName",
          "phone",
          "vehicle",
          "startsAt",
          "endsAt",
          "durationMinutes",
          "priceAmount",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${userId ?? null},
          ${customer.vehicleId},
          ${dto.stationId},
          ${dto.serviceId},
          ${candidate.id},
          ${customer.name},
          ${customer.phone},
          ${customer.vehicle},
          ${startsAt},
          ${endsAt},
          ${offer.durationMinutes},
          ${offer.priceFrom},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING
        RETURNING
          "id",
          "stationId",
          "serviceId",
          "vehicleId",
          "customerName",
          "phone",
          "vehicle",
          "startsAt",
          "endsAt",
          "durationMinutes",
          "priceAmount",
          "status",
          "createdAt"
      `);

      if (bookings[0]) return bookings[0];
    }

    throw new ConflictException(
      'Это время только что заняли. Выберите другой свободный слот',
    );
  }

  private async resolveCustomer(dto: CreateBookingDto, userId?: number) {
    if (!userId) {
      if (!dto.customerName || !dto.phone || !dto.vehicle) {
        throw new BadRequestException(
          'Для записи без аккаунта укажите имя, телефон и автомобиль',
        );
      }

      if (dto.vehicleId) {
        throw new BadRequestException(
          'Сохранённый автомобиль доступен только после входа',
        );
      }

      return {
        name: dto.customerName,
        phone: dto.phone,
        vehicle: dto.vehicle,
        vehicleId: null,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true },
    });

    if (!user) {
      throw new BadRequestException('Аккаунт пользователя не найден');
    }

    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, userId },
        select: { id: true, name: true },
      });

      if (!vehicle) {
        throw new BadRequestException('Автомобиль не найден в вашем кабинете');
      }

      return {
        name: user.name,
        phone: user.phone,
        vehicle: vehicle.name,
        vehicleId: vehicle.id,
      };
    }

    if (!dto.vehicle) {
      throw new BadRequestException('Выберите или укажите автомобиль');
    }

    return {
      name: user.name,
      phone: user.phone,
      vehicle: dto.vehicle,
      vehicleId: null,
    };
  }
}
