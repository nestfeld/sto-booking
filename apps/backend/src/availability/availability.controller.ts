import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';
import { GetAvailabilityQueryDto } from './dto/get-availability-query.dto.js';

@Controller('api/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  findAvailableSlots(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetAvailabilityQueryDto,
  ) {
    return this.availabilityService.findAvailableSlots(query);
  }
}
