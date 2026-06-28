import { IsString, MinLength } from 'class-validator';

export class UpdateShippingAddressDto {
  @IsString()
  @MinLength(3)
  line1: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsString()
  @MinLength(2)
  country: string;
}
