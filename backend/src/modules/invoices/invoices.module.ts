import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesAdminController } from './invoices.admin.controller';

@Module({
  controllers: [InvoicesAdminController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
