import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ShipOrderDto {
  @IsOptional()
  @IsString()
  delivery_name?: string;

  @IsOptional()
  @IsString()
  delivery_phone?: string;

  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsString()
  delivery_city?: string;

  @IsOptional()
  @IsString()
  delivery_state?: string;

  @IsOptional()
  @IsString()
  delivery_pincode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weight?: number;
}
