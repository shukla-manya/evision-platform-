import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { ShipOrderDto } from './dto/ship-order.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/orders')
export class OrdersAdminController {
  constructor(private orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for your shop only' })
  list(@CurrentUser() user: { id: string }) {
    return this.orders.listForAdmin(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one order for your shop with items and shipment info' })
  getOne(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.getAdminOrderById(user.id, id);
  }

  @Post(':id/ship')
  @ApiOperation({
    summary: 'Create Shiprocket shipment, save AWB + courier on order, email customer tracking details',
  })
  ship(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShipOrderDto,
  ) {
    return this.orders.shipOrderForAdmin(user.id, id, dto);
  }
}
