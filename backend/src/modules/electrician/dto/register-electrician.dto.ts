import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsEmail, IsNumberString, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterElectricianDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, { message: 'Phone must be E.164 format' })
  phone: string;

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

  @ApiProperty({ example: '28.4089', description: 'Latitude as decimal string' })
  @IsNumberString()
  lat: string;

  @ApiProperty({ example: '77.3178', description: 'Longitude as decimal string' })
  @IsNumberString()
  lng: string;

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
