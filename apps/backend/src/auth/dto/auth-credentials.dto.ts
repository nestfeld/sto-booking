import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class AuthCredentialsDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'Логин должен быть строкой' })
  @Length(3, 32, { message: 'Логин должен содержать от 3 до 32 символов' })
  @Matches(/^[a-z0-9._-]+$/, {
    message:
      'Логин может содержать латинские буквы, цифры, точки, дефисы и подчёркивания',
  })
  login!: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  @Length(8, 64, { message: 'Пароль должен содержать от 8 до 64 символов' })
  password!: string;
}
