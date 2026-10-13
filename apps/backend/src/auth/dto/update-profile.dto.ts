import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @Transform(trim)
  @IsOptional()
  @IsString({ message: 'Имя должно быть строкой' })
  @Length(2, 80, { message: 'Имя должно содержать от 2 до 80 символов' })
  name?: string;

  @Transform(trim)
  @IsOptional()
  @IsString({ message: 'Телефон должен быть строкой' })
  @IsNotEmpty({ message: 'Укажите номер телефона' })
  @MaxLength(24, { message: 'Телефон должен содержать не более 24 символов' })
  phone?: string;
}
