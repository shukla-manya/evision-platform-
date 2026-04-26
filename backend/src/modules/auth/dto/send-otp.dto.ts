import { IsString, Matches, IsOptional, IsIn, IsEmail, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, { message: 'Phone must be in E.164 format e.g. +919876543210' })
  phone: string;

  @ApiPropertyOptional({
    enum: ['login', 'signup'],
    description:
      'Use `signup` from the registration flow so phone and email are checked for conflicts before an OTP is sent. Omit or `login` for sign-in and other flows.',
  })
  @IsOptional()
  @IsIn(['login', 'signup'])
  purpose?: 'login' | 'signup';

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Required when purpose is `signup`' })
  @ValidateIf((o) => o.purpose === 'signup')
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email?: string;
}
