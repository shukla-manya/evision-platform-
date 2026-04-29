import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsNumber,
  Min,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Havells 16A MCB' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Single pole miniature circuit breaker.' })
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty({
    example: 450,
    description: 'Retail price shown to customers & guests. Never returned to dealer role.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_customer: number;

  @ApiProperty({
    example: 380,
    description: 'Wholesale price for verified dealers only. Never returned to customer role.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_dealer: number;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  category_id: string;

  @ApiPropertyOptional({ example: 'Havells' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description:
      'Existing image URLs (typically from POST /superadmin/products/images/upload). Stored in DynamoDB; served via CloudFront when CLOUDFRONT_DOMAIN is set.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({ example: 10, description: 'Alert when stock is at or below this value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  low_stock_threshold?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Minimum units per line for dealer checkout (default 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  min_order_quantity?: number;

  @ApiPropertyOptional({
    example: 499,
    description: 'Optional MRP / list price for dealer savings display; defaults to retail price if omitted',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mrp?: number;
}
