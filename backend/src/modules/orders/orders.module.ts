import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersSuperadminController } from './orders.superadmin.controller';
import { OrdersController } from './orders.controller';
import { OrdersWebhookController } from './orders.webhook.controller';
import { ShiprocketService } from './shiprocket.service';

@Module({
  controllers: [OrdersSuperadminController, OrdersController, OrdersWebhookController],
  providers: [OrdersService, ShiprocketService],
  exports: [OrdersService],
})
export class OrdersModule {}
