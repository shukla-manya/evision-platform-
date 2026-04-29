import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Allow,
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterElectricianDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, { message: 'Phone must be E.164 format' })
  phone: string;

  @ApiProperty({ example: '482931', description: '6-digit OTP from POST /auth/send-otp to the same email' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;

  @ApiProperty({ example: 'ravi.electrician@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'SecurePass@123',
    description: 'Optional legacy field; sign-in is mobile OTP only',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: 'Near Sector 15 market, Faridabad' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '28.4089', description: 'Latitude (resolved from GPS or geocoding)' })
  @IsOptional()
  @IsNumberString()
  lat?: string;

  @ApiPropertyOptional({ example: '77.3178', description: 'Longitude (resolved from GPS or geocoding)' })
  @IsOptional()
  @IsNumberString()
  lng?: string;

  @ApiPropertyOptional({
    example: '["wiring","solar","inverter"] or wiring,solar,inverter',
  })
  @IsOptional()
  @IsString()
  skills?: string;

  /** Multipart file field — validated in controller via `@UploadedFiles()`; must exist on DTO for `forbidNonWhitelisted`. */
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  @Allow()
  aadhar?: unknown;

  /** Multipart file field — validated in controller via `@UploadedFiles()`. */
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  @Allow()
  photo?: unknown;
}
