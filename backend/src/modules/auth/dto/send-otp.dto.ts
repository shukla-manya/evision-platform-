import { IsString, Matches, IsOptional, IsIn, IsEmail, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
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
  @IsEmail()
  email?: string;
}
