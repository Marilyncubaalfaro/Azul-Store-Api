import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export class UpdatePhoneDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^9\d{8}$/, {
    message:
      'El celular debe tener exactamente 9 digitos y empezar con 9 (ejemplo: 912345678).',
  })
  phone: string;
}
