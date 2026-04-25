import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersAdminController } from './orders.admin.controller';

@Module({
  controllers: [OrdersAdminController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
