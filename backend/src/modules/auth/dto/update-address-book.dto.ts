import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AddressBookEntryDto {
  @ApiPropertyOptional({ example: 'addr-1' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Home' })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty({ example: '12 MG Road' })
  @IsString()
  @MinLength(3)
  address: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @MinLength(2)
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MinLength(2)
  state: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  @MinLength(5)
  pincode: string;

  @ApiPropertyOptional({ example: 12.97 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 77.59 })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateAddressBookDto {
  @ApiProperty({ type: [AddressBookEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressBookEntryDto)
  addresses: AddressBookEntryDto[];
}
