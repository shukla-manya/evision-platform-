import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Switchgear' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: 'Parent category id for subcategories' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;
}
