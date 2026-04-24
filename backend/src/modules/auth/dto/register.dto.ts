import { IsString, IsEmail, IsEnum, IsOptional, Matches, MinLength } from 'class-validator';
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

  @ApiProperty({ enum: ['customer', 'dealer'] })
  @IsEnum(['customer', 'dealer'])
  role: 'customer' | 'dealer';

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
