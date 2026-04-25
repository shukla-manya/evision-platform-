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

  @ApiProperty({ example: 'Plot 12, Sector 15' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Faridabad' })
  @IsString()
  city: string;

  @ApiProperty({ example: '121007' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode: string;

  @ApiPropertyOptional({ description: 'Shop logo URL (set when uploading logo with registration)' })
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
