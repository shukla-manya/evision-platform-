import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateElectricianProfileDto {
  @ApiPropertyOptional({ type: [String], example: ['AC repair', 'Wiring'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 5, description: 'Years of experience (1–60)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  experience_years?: number;

  @ApiPropertyOptional({
    example: 'Delhi, 110044, India',
    description: 'City, PIN, and region line (stored with experience in service address)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  service_area?: string;
}
