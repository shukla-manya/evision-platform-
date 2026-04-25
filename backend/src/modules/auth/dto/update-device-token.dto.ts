import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateDeviceTokenDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging token for this device' })
  @IsString()
  @MaxLength(2048)
  fcm_token: string;
}
