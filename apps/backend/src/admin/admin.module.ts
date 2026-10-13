import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminBookingsController } from './admin-bookings.controller.js';
import { AdminBookingsService } from './admin-bookings.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminBookingsController],
  providers: [AdminBookingsService],
})
export class AdminModule {}
