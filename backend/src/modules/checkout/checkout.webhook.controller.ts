import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CheckoutService } from './checkout.service';

@ApiTags('Checkout')
@Controller('webhooks')
export class CheckoutWebhookController {
  constructor(private checkout: CheckoutService) {}

  @Public()
  @Post('razorpay')
  @ApiOperation({ summary: 'Razorpay payment webhook' })
  handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    if (!signature) throw new BadRequestException('Missing x-razorpay-signature header');
    if (!req.rawBody) throw new BadRequestException('Missing raw webhook body');
    return this.checkout.processWebhook(
      req.rawBody,
      signature,
      req.body as Record<string, unknown>,
    );
  }
}
