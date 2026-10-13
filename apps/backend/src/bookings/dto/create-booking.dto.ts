import { Transform, Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stationId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceId!: number;

  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'startsAt must include a timezone offset',
  })
  startsAt!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(2, 80)
  customerName?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d ()-]{7,24}$/, {
    message: 'phone must contain a valid phone number',
  })
  phone?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(2, 120)
  vehicle?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  vehicleId?: number;
}
