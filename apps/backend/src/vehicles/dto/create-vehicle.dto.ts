import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CreateVehicleDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 120, {
    message: 'Название автомобиля должно содержать от 2 до 120 символов',
  })
  name!: string;
}
