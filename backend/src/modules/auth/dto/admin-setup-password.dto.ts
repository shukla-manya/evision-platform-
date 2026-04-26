import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminSetupPasswordDto {
  @ApiProperty({ description: 'JWT from the approval email (setup-password link)' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'SecurePass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  new_password: string;
}
