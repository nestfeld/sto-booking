import { Type } from 'class-transformer';
import { IsInt, Matches, Min } from 'class-validator';

export class GetAvailabilityQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stationId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceId!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must use YYYY-MM-DD format',
  })
  date!: string;
}
