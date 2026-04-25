import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { EmailService } from '../emails/email.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ShiprocketService } from './shiprocket.service';

const STATUS_MAP: Record<string, string> = {
  'picked up': 'picked_up',
  'in transit': 'in_transit',
  'out for delivery': 'out_for_delivery',
  delivered: 'delivered',
  'pickup scheduled': 'pickup_scheduled',
  'pickup queued': 'pickup_queued',
  'rto initiated': 'rto_initiated',
  'rto delivered': 'rto_delivered',
};

@ApiTags('Webhooks')
@Public()
@Controller('webhooks')
export class ShiprocketWebhookController {
  private readonly logger = new Logger(ShiprocketWebhookController.name);

  constructor(
    private config: ConfigService,
    private dynamo: DynamoService,
    private email: EmailService,
    private invoices: InvoicesService,
    private shiprocket: ShiprocketService,
  ) {}

  @Post('shiprocket')
  @ApiOperation({ summary: 'Shiprocket delivery status webhook' })
  async handle(
    @Query('token') token: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const expectedToken = this.config.get<string>('SHIPROCKET_WEBHOOK_TOKEN');
    if (expectedToken && token !== expectedToken) {
      throw new BadRequestException('Invalid webhook token');
    }

    const awb = String(payload.awb || payload.awb_code || '');
    const rawStatus = String(payload.current_status || payload.status || '').toLowerCase().trim();

    this.logger.log(`Shiprocket webhook: awb=${awb} status="${rawStatus}"`);

    if (!awb) {
      return { ok: true, ignored: true, reason: 'no awb' };
    }

    const internalStatus = STATUS_MAP[rawStatus];
    if (!internalStatus) {
      return { ok: true, ignored: true, reason: `unmapped status: ${rawStatus}` };
    }

    // Skip statuses that don't need DB/email updates
    if (internalStatus === 'pickup_scheduled' || internalStatus === 'pickup_queued') {
      return { ok: true, ignored: true, reason: 'informational status' };
    }

    const order = await this.shiprocket.findOrderByAwb(awb);
    if (!order) {
      this.logger.warn(`No order found for AWB ${awb}`);
      return { ok: true, ignored: true, reason: 'order not found' };
    }

    const orderId = String(order.id);
    const userId = String(order.user_id || '');
    const now = new Date().toISOString();

    await this.dynamo.update(this.dynamo.tableName('orders'), { id: orderId }, {
      status: internalStatus,
      updated_at: now,
      ...(internalStatus === 'delivered' ? { delivered_at: now } : {}),
    });

    const user = userId
      ? await this.dynamo.get(this.dynamo.tableName('users'), { id: userId })
      : null;

    if (user?.email) {
      await this.sendStatusEmail(internalStatus, String(user.email), {
        customerName: String(user.name || 'Customer'),
        orderId,
        awbNumber: awb,
        courierName: String(order.courier_name || 'Courier'),
      });
    }

    if (internalStatus === 'delivered') {
      try {
        await this.invoices.generateForOrder(orderId);
        this.logger.log(`Invoice generated for delivered order ${orderId}`);
      } catch (err) {
        this.logger.error(`Invoice generation failed for order ${orderId}: ${err.message}`);
      }
    }

    return { ok: true, order_id: orderId, status: internalStatus };
  }

  private async sendStatusEmail(
    status: string,
    toEmail: string,
    data: { customerName: string; orderId: string; awbNumber: string; courierName: string },
  ): Promise<void> {
    try {
      switch (status) {
        case 'picked_up':
          await this.email.sendOrderPickedUp(toEmail, data);
          break;
        case 'in_transit':
          await this.email.sendOrderInTransit(toEmail, data);
          break;
        case 'out_for_delivery':
          await this.email.sendOrderOutForDelivery(toEmail, data);
          break;
        case 'delivered':
          await this.email.sendOrderDelivered(toEmail, {
            customerName: data.customerName,
            orderId: data.orderId,
          });
          break;
      }
    } catch (err) {
      this.logger.error(`Failed to send ${status} email to ${toEmail}: ${err.message}`);
    }
  }
}
