import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CheckoutWebhookController } from './checkout.webhook.controller';

@Module({
  imports: [CartModule],
  controllers: [CheckoutController, CheckoutWebhookController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
