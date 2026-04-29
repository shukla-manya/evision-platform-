import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitContactMessageDto {
  @ApiProperty({ example: 'Priya' })
  @IsString()
  @MaxLength(120)
  first_name: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @MaxLength(120)
  last_name: string;

  @ApiProperty({ example: 'priya@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'I would like a quote for…' })
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  message: string;
}
