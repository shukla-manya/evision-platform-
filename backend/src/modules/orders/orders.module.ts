import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersAdminController } from './orders.admin.controller';
import { OrdersController } from './orders.controller';
import { OrdersWebhookController } from './orders.webhook.controller';
import { ShiprocketService } from './shiprocket.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [OrdersAdminController, OrdersController, OrdersWebhookController],
  providers: [OrdersService, ShiprocketService],
  exports: [OrdersService],
})
export class OrdersModule {}
