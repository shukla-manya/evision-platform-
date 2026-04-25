import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesAdminController } from './invoices.admin.controller';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  controllers: [InvoicesAdminController],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
