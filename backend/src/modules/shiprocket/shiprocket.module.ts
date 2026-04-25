import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { ShiprocketService } from './shiprocket.service';
import { ShiprocketWebhookController } from './shiprocket.webhook.controller';

@Module({
  imports: [InvoicesModule],
  controllers: [ShiprocketWebhookController],
  providers: [ShiprocketService],
  exports: [ShiprocketService],
})
export class ShiprocketModule {}
