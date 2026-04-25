import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsString, MinLength } from 'class-validator';

export class CreateServiceRequestDto {
  @ApiProperty({ example: 'Fan not working in bedroom' })
  @IsString()
  @MinLength(5)
  issue: string;

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
