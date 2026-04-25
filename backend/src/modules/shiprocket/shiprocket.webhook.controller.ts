import { BadRequestException, Body, Controller, Logger, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { OrdersService } from '../orders/orders.service';

@ApiTags('Webhooks')
@Public()
@Controller('webhooks')
export class ShiprocketWebhookController {
  private readonly logger = new Logger(ShiprocketWebhookController.name);

  constructor(
    private config: ConfigService,
    private orders: OrdersService,
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

    this.logger.log(
      `Shiprocket webhook received: awb=${payload.awb ?? payload.awb_code} status="${payload.current_status ?? payload.status}"`,
    );

    return this.orders.handleShiprocketWebhook(payload);
  }
}
