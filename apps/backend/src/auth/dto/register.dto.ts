import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { AuthCredentialsDto } from './auth-credentials.dto.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto extends AuthCredentialsDto {
  @Transform(trim)
  @IsString({ message: 'Имя должно быть строкой' })
  @Length(2, 80, { message: 'Имя должно содержать от 2 до 80 символов' })
  name!: string;

  @Transform(trim)
  @IsString({ message: 'Телефон должен быть строкой' })
  @IsNotEmpty({ message: 'Укажите номер телефона' })
  @MaxLength(24, { message: 'Телефон должен содержать не более 24 символов' })
  phone!: string;
}
