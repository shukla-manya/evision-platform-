import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesSuperadminController } from './invoices.superadmin.controller';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  controllers: [InvoicesSuperadminController],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
