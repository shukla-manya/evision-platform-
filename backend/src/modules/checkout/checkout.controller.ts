import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CheckoutService } from './checkout.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'dealer')
@Controller('checkout')
export class CheckoutController {
  constructor(private checkout: CheckoutService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create Razorpay order from cart total and return razorpay_order_id for payment sheet',
  })
  create(@CurrentUser() user: { id: string }) {
    return this.checkout.createOrder(user.id);
  }

  @Post('confirm')
  @ApiOperation({
    summary:
      'Confirm Razorpay payment status from client (success/failure) to finalize order status quickly',
  })
  confirm(
    @CurrentUser() user: { id: string },
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.checkout.confirmPayment(user.id, dto);
  }
}
