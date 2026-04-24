import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ description: 'Set to another category id; omit to leave unchanged' })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  parent_id?: string;
}
