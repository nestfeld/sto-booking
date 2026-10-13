import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StationsService } from './stations.service.js';

@Controller('api/stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  findAll() {
    return this.stationsService.findAll();
  }

  @Get(':id/services')
  findServices(@Param('id', ParseIntPipe) id: number) {
    return this.stationsService.findServices(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stationsService.findOne(id);
  }
}
