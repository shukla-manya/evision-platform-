import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUrl,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_customer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_dealer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Replace entire images list when provided' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  low_stock_threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  min_order_quantity?: number;

  @ApiPropertyOptional({ nullable: true, description: 'Set null to clear MRP' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mrp?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Amazon or other buy link; set null to remove',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUrl()
  amazon_url?: string | null;

  @ApiPropertyOptional({
    description:
      'Homepage showcase: `primary` = Advanced CCTV grid, `combos` = Security Camera Collection row. Send empty string to remove from homepage.',
  })
  @IsOptional()
  @IsIn(['primary', 'combos', ''])
  home_showcase_section?: '' | 'primary' | 'combos';

  @ApiPropertyOptional({ description: 'Sort order within the section (lower first)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9999)
  home_showcase_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  home_showcase_hot?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Homepage-only star display; set null to clear',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  home_showcase_rating?: number | null;
}
