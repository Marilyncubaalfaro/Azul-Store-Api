import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class UpdateStockDto {
  @IsString()
  @MinLength(1)
  size: string;

  @IsInt()
  @Min(0)
  stock: number;
}
