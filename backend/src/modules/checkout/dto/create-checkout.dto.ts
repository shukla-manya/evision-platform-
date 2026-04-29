import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateCheckoutDto {
  @ApiPropertyOptional({ description: 'Selected address book index for delivery snapshot' })
  @IsOptional()
  @IsInt()
  @Min(0)
  delivery_address_index?: number;
}
