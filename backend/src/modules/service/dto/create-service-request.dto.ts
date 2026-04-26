import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateServiceRequestDto {
  @ApiProperty({ example: 'Fan not working in bedroom' })
  @IsString()
  @MinLength(5)
  issue: string;

  @ApiPropertyOptional({ description: 'Shop sub-order id when booking from a delivered order' })
  @IsOptional()
  @IsString()
  order_sub_order_id?: string;

  @ApiPropertyOptional({ example: 'Canon EOS R6 Body' })
  @IsOptional()
  @IsString()
  product_label?: string;

  @ApiPropertyOptional({ example: '12 MG Road, Bengaluru — flat 4B' })
  @IsOptional()
  @IsString()
  service_address?: string;

  @ApiProperty({ example: '2026-04-28' })
  @IsString()
  preferred_date: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  time_from: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  time_to: string;

  @ApiProperty({ example: '28.4089' })
  @IsNumberString()
  lat: string;

  @ApiProperty({ example: '77.3178' })
  @IsNumberString()
  lng: string;
}
