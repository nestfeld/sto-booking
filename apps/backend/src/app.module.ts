import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ServicesModule } from './services/services.module.js';
import { StationsModule } from './stations/stations.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';

@Module({
  imports: [
    PrismaModule,
    AdminModule,
    ServicesModule,
    StationsModule,
    AvailabilityModule,
    AuthModule,
    BookingsModule,
    VehiclesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
