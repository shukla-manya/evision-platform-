import { Controller, Get, Param, ParseUUIDPipe, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'dealer')
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Get('my/gst-invoices-zip')
  @ApiOperation({
    summary: 'Download all GST tax invoice PDFs for my orders as one ZIP file',
  })
  async gstInvoicesZip(@CurrentUser() user: { id: string }, @Res() res: Response) {
    await this.orders.streamGstInvoicesZip(user.id, res);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my order groups with per-shop sub-orders and items' })
  myOrders(@CurrentUser() user: { id: string }) {
    return this.orders.listGroupsForUser(user.id);
  }

  @Post(':groupId/cancel')
  @ApiOperation({ summary: 'Cancel one order group and all sub-orders' })
  cancel(
    @CurrentUser() user: { id: string },
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.orders.cancelGroupForUser(user.id, groupId);
  }
}
