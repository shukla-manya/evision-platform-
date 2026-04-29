import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'dealer')
@Controller('checkout')
export class CheckoutController {
  constructor(private checkout: CheckoutService) {}

  @Post()
  @ApiOperation({
    summary: 'Create PayU hosted-checkout payload from cart (form POST to PayU)',
  })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCheckoutDto) {
    return this.checkout.createOrder(user.id, dto);
  }
}
