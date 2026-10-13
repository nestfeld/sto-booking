import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const services = await this.prisma.service.findMany({
      where: {
        isActive: true,
        stations: {
          some: {
            isActive: true,
            station: { isActive: true },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        durationMinutes: true,
        priceFrom: true,
        stations: {
          where: {
            isActive: true,
            station: { isActive: true },
          },
          select: { stationId: true },
        },
      },
    });

    return services.map(({ stations, ...service }) => ({
      ...service,
      stationCount: stations.length,
    }));
  }

  async findOne(id: number) {
    const service = await this.prisma.service.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        durationMinutes: true,
        priceFrom: true,
        stations: {
          where: {
            isActive: true,
            station: { isActive: true },
          },
          orderBy: { station: { name: 'asc' } },
          select: {
            durationMinutes: true,
            priceFrom: true,
            station: {
              select: {
                id: true,
                slug: true,
                name: true,
                address: true,
                phone: true,
                timezone: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Услуга не найдена');
    }

    return {
      ...service,
      stations: service.stations.map(({ station, ...offer }) => ({
        ...station,
        ...offer,
      })),
    };
  }
}
