import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUrl,
  IsIn,
  Matches,
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
  /** S3/CloudFront/http(s) or local stub (`local-dev://`); strict IsUrl rejects localhost and stub schemes. */
  @IsString({ each: true })
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

  @ApiPropertyOptional({
    example: 'https://www.amazon.in/dp/XXXXXXXXXX',
    description: 'Optional external purchase link (e.g. Amazon) shown on the product page',
  })
  @IsOptional()
  @IsUrl()
  amazon_url?: string;

  @ApiPropertyOptional({
    enum: ['primary', 'combos'],
    description: 'Homepage showcase grid (Advanced CCTV section vs combos row). Omit if not featured.',
  })
  @IsOptional()
  @IsIn(['primary', 'combos'])
  home_showcase_section?: 'primary' | 'combos';

  @ApiPropertyOptional({ example: 0, description: 'Sort order within the chosen homepage section (lower first)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9999)
  home_showcase_order?: number;

  @ApiPropertyOptional({ description: 'Show “Hot” ribbon on homepage card' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  home_showcase_hot?: boolean;

  @ApiPropertyOptional({ example: 4.5, description: 'Star rating shown on homepage card (1–5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  home_showcase_rating?: number;

  @ApiPropertyOptional({
    example: '85176290',
    description: 'HSN/SAC for GST tax invoices (digits only, 4–10 characters)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,10}$/)
  hsn_code?: string;

  @ApiPropertyOptional({
    example: 'HAV-MCB-16A',
    description: 'Seller or manufacturer SKU printed on order invoices',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  store_sku?: string;
}
