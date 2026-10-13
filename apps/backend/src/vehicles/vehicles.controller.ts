import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { VehiclesService } from './vehicles.service.js';

const vehiclePipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('api/vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.vehiclesService.findAll(request.user.id);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body(vehiclePipe) dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(request.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.vehiclesService.remove(request.user.id, id);
  }
}
