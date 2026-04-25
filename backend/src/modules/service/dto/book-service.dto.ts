import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class BookServiceDto {
  @ApiProperty({ example: 'f7fc25e2-03d8-4707-95c3-4f80bfd06808' })
  @IsString()
  service_request_id: string;
}
