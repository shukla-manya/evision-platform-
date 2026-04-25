import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ShipOrderDto {
  @IsString()
  delivery_name: string;

  @IsString()
  delivery_phone: string;

  @IsString()
  delivery_address: string;

  @IsString()
  delivery_city: string;

  @IsString()
  delivery_state: string;

  @IsString()
  delivery_pincode: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weight?: number;
}
