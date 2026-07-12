import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('51')) {
      return digits.slice(2);
    }

    return digits;
  })
  @Matches(/^9\d{8}$/, {
    message:
      'El celular debe ser de Peru y tener 9 digitos (ejemplo: 912345678).',
  })
  phone?: string;
}
