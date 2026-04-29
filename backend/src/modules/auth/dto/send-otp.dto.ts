import { IsOptional, IsIn, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'OTP is sent to this address via SMTP (Nodemailer)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: ['login', 'signup'],
    description:
      'Use `signup` during registration so the email is checked for conflicts before an OTP is sent. Omit or `login` for sign-in.',
  })
  @IsOptional()
  @IsIn(['login', 'signup'])
  purpose?: 'login' | 'signup';
}
