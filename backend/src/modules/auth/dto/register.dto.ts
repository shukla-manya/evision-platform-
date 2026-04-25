import { IsString, IsEmail, IsEnum, IsOptional, Matches, MinLength, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Rahul Kumar' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, { message: 'Phone must be in E.164 format' })
  phone: string;

  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['customer', 'dealer', 'electrician'] })
  @IsEnum(['customer', 'dealer', 'electrician'])
  role: 'customer' | 'dealer' | 'electrician';

  @ApiProperty({ example: '482931', description: 'OTP sent to the same phone via /auth/send-otp' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;

  @ApiPropertyOptional({ example: '07AABCU9603R1ZP', description: 'Required for dealers' })
  @IsOptional()
  @IsString()
  gst_no?: string;

  @ApiPropertyOptional({ example: '4th Floor, Tech Park, Faridabad' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@shop.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class SuperadminLoginDto {
  @ApiProperty({ example: 'superadmin@evisionpvtltd.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}

export class ElectricianLoginDto {
  @ApiProperty({ example: 'ravi@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginOtpVerifyDto {
  @ApiProperty({ description: 'Temporary token returned from admin/superadmin login step 1' })
  @IsString()
  login_token: string;

  @ApiProperty({ example: '482931' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}
