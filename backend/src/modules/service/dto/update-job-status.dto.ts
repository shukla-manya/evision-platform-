import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateJobStatusDto {
  @ApiProperty({ enum: ['on_the_way', 'reached', 'work_started', 'completed'] })
  @IsIn(['on_the_way', 'reached', 'work_started', 'completed'])
  status: 'on_the_way' | 'reached' | 'work_started' | 'completed';
}
