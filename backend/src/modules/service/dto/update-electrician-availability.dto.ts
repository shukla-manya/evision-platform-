import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateElectricianAvailabilityDto {
  @ApiProperty({ example: true, description: 'true => online, false => offline' })
  @IsBoolean()
  online: boolean;
}
