import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({ enum: ['success', 'failure'] })
  @IsIn(['success', 'failure'])
  status: 'success' | 'failure';

  @ApiProperty({ example: 'order_Q8fH2m8a3lPq7Z' })
  @IsString()
  razorpay_order_id: string;

  @ApiPropertyOptional({ example: 'pay_Q8fIl4x0wqR2kD' })
  @IsOptional()
  @IsString()
  razorpay_payment_id?: string;

  @ApiPropertyOptional({ example: '2f2f8f9055a2ec9e1a9f1c8d6d2fc3c8c3af2fd7235f0a5dbe8e7c941a49b999' })
  @IsOptional()
  @IsString()
  razorpay_signature?: string;

  @ApiPropertyOptional({ example: 'Payment cancelled by user' })
  @IsOptional()
  @IsString()
  failure_reason?: string;
}
