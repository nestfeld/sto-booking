import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsOptional, Min } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class ListAdminBookingsQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus, { message: 'Указан неизвестный статус записи' })
  status?: BookingStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Идентификатор филиала должен быть целым числом' })
  @Min(1, { message: 'Идентификатор филиала должен быть положительным' })
  stationId?: number;

  @IsOptional()
  @IsISO8601({}, { message: 'Начальная дата должна быть в формате ISO 8601' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Конечная дата должна быть в формате ISO 8601' })
  to?: string;
}
