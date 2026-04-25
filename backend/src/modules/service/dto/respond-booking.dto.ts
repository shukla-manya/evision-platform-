import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class RespondBookingDto {
  @ApiProperty({ enum: ['accept', 'decline'] })
  @IsIn(['accept', 'decline'])
  action: 'accept' | 'decline';
}
