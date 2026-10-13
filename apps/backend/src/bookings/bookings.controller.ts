import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type {
  AuthenticatedRequest,
  OptionallyAuthenticatedRequest,
} from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard.js';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

const createBookingPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('api/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.bookingsService.findMine(request.user.id);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(
    @Body(createBookingPipe) dto: CreateBookingDto,
    @Req() request: OptionallyAuthenticatedRequest,
  ) {
    return this.bookingsService.create(dto, request.user?.id);
  }
}
