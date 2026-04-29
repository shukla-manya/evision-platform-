import { BadRequestException, Controller, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CheckoutService } from './checkout.service';

@ApiTags('Checkout')
@Controller('webhooks')
export class CheckoutWebhookController {
  constructor(private checkout: CheckoutService) {}

  @Public()
  @Post('payu/return')
  @ApiOperation({ summary: 'PayU browser return (surl/furl) — verifies hash and redirects to storefront' })
  async payuReturn(@Req() req: Request, @Res() res: Response) {
    if (!req.body || typeof req.body !== 'object') {
      throw new BadRequestException('Invalid PayU callback body');
    }
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.body as Record<string, unknown>)) {
      flat[k] = v === undefined || v === null ? '' : String(v);
    }
    const url = await this.checkout.handlePayuBrowserReturn(flat);
    return res.redirect(302, url);
  }
}
