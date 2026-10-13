import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AvailabilityModule } from '../availability/availability.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [AuthModule, AvailabilityModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
