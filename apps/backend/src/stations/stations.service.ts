import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const stations = await this.prisma.station.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        phone: true,
        timezone: true,
        services: {
          where: {
            isActive: true,
            service: { isActive: true },
          },
          select: { serviceId: true },
        },
      },
    });

    return stations.map(({ services, ...station }) => ({
      ...station,
      serviceCount: services.length,
    }));
  }

  async findOne(id: number) {
    const station = await this.prisma.station.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        phone: true,
        timezone: true,
        services: {
          where: {
            isActive: true,
            service: { isActive: true },
          },
          orderBy: { service: { sortOrder: 'asc' } },
          select: {
            durationMinutes: true,
            priceFrom: true,
            service: {
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundException('СТО не найдена');
    }

    return {
      ...station,
      services: station.services.map(({ service, ...offer }) => ({
        ...service,
        ...offer,
      })),
    };
  }

  async findServices(id: number) {
    const station = await this.findOne(id);
    return station.services;
  }
}
