import { IsEnum } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus, { message: 'Указан неизвестный статус записи' })
  status!: BookingStatus;
}
