import { IsString, IsEmail, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAdminDto {
  @ApiProperty({ example: 'Sharma Electric Store' })
  @IsString()
  @MinLength(2)
  shop_name: string;

  @ApiProperty({ example: 'Raj Sharma' })
  @IsString()
  @MinLength(2)
  owner_name: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, { message: 'Phone must be E.164 format' })
  phone: string;

  @ApiProperty({ example: 'raj@sharmaelectric.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '07AABCU9603R1ZP' })
  @IsString()
  gst_no: string;

  @ApiProperty({ example: 'Sector 15, Faridabad, Haryana 121007' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Shop logo — upload separately to /admin/upload-logo' })
  @IsOptional()
  @IsString()
  logo_url?: string;
}

export class ApproveAdminDto {
  @ApiPropertyOptional({ example: 'GST number mismatch' })
  @IsOptional()
  @IsString()
  reason?: string;
}
