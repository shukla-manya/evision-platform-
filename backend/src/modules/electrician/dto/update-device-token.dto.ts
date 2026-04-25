import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateElectricianDeviceTokenDto {
  @ApiProperty({ example: 'fcm_device_token_abc123' })
  @IsString()
  @MinLength(8)
  fcm_token: string;
}
