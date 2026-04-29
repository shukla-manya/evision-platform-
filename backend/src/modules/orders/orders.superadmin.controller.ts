import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { ShipOrderDto } from './dto/ship-order.dto';

@ApiTags('Superadmin Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('superadmin/orders')
export class OrdersSuperadminController {
  constructor(
    private orders: OrdersService,
    private config: ConfigService,
  ) {}

  private platformAdminId(): string {
    const id = this.config.get<string>('PLATFORM_CATALOG_ADMIN_ID')?.trim();
    if (!id) throw new BadRequestException('PLATFORM_CATALOG_ADMIN_ID must be set');
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'List orders for the platform catalogue shop' })
  list() {
    return this.orders.listForAdmin(this.platformAdminId());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one order for the platform catalogue shop' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getAdminOrderById(this.platformAdminId(), id);
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Ship order (Shiprocket)' })
  ship(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ShipOrderDto) {
    return this.orders.shipOrderForAdmin(this.platformAdminId(), id, dto);
  }
}
