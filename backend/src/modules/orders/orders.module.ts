import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersAdminController } from './orders.admin.controller';
import { OrdersController } from './orders.controller';

@Module({
  controllers: [OrdersAdminController, OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
