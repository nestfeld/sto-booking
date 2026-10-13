import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, name: true, createdAt: true },
    });
  }

  async create(userId: number, dto: CreateVehicleDto) {
    try {
      return await this.prisma.vehicle.create({
        data: { userId, name: dto.name },
        select: { id: true, name: true, createdAt: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Этот автомобиль уже добавлен');
      }

      throw error;
    }
  }

  async remove(userId: number, id: number) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Автомобиль не найден');
    }

    await this.prisma.vehicle.delete({ where: { id } });
  }
}
