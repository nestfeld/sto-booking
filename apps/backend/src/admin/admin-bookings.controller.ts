import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminBookingsService } from './admin-bookings.service.js';
import { ListAdminBookingsQueryDto } from './dto/list-admin-bookings-query.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

const adminPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('api/admin/bookings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBookingsController {
  constructor(private readonly bookingsService: AdminBookingsService) {}

  @Get()
  findAll(@Query(adminPipe) query: ListAdminBookingsQueryDto) {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(adminPipe) dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, dto.status);
  }
}
