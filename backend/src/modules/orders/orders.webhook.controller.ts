import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('webhooks')
export class OrdersWebhookController {
  constructor(
    private orders: OrdersService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('shiprocket')
  @ApiOperation({ summary: 'Shiprocket delivery status webhook' })
  receive(
    @Body() payload: Record<string, unknown>,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-shiprocket-token') shiprocketToken?: string,
  ) {
    const expected = this.config.get<string>('SHIPROCKET_WEBHOOK_TOKEN');
    if (expected && apiKey !== expected && shiprocketToken !== expected) {
      throw new UnauthorizedException('Invalid webhook token');
    }
    return this.orders.handleShiprocketWebhook(payload);
  }
}
