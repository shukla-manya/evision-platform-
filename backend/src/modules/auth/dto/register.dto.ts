import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  Matches,
  MinLength,
  Length,
  ValidateIf,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
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

  @ApiProperty({ enum: ['customer', 'dealer'], description: 'Technicians register via POST /electrician/register' })
  @IsEnum(['customer', 'dealer'])
  role: 'customer' | 'dealer';

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

  @ApiPropertyOptional({ example: 'Manya Optics Pvt Ltd', description: 'Required for dealer registration' })
  @IsOptional()
  @IsString()
  business_name?: string;

  @ApiPropertyOptional({
    example: 'Plot 12, Sector 18, Noida, UP',
    description: 'Registered business address for dealers',
  })
  @IsOptional()
  @IsString()
  business_address?: string;

  @ApiPropertyOptional({ example: 'Noida', description: 'Required when role is dealer' })
  @ValidateIf((o) => o.role === 'dealer')
  @IsString()
  @MinLength(1, { message: 'Business city is required for dealers' })
  business_city?: string;

  @ApiPropertyOptional({ example: '201301', description: '6 digits when role is dealer' })
  @ValidateIf((o) => o.role === 'dealer')
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Business pincode must be 6 digits' })
  business_pincode?: string;

  @ApiPropertyOptional({ example: 28.4089, description: 'Optional: device or resolved latitude at signup' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: 77.3178, description: 'Optional: device or resolved longitude at signup' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class PasswordResetStartDto {
  @ApiProperty({ enum: ['electrician', 'admin'], description: 'Customers and dealers sign in with OTP only.' })
  @IsEnum(['electrician', 'admin'])
  role: 'electrician' | 'admin';

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, { message: 'Phone must be in E.164 format' })
  phone: string;
}

export class PasswordResetCompleteDto {
  @ApiProperty({ enum: ['electrician', 'admin'] })
  @IsEnum(['electrician', 'admin'])
  role: 'electrician' | 'admin';

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, { message: 'Phone must be in E.164 format' })
  phone: string;

  @ApiProperty({ example: '482931' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(6)
  new_password: string;
}
