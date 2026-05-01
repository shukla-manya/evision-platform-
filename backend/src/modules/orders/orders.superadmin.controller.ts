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

  /** Detail and ship need a configured platform catalogue admin UUID. */
  private requirePlatformAdminId(): string {
    const id = this.config.get<string>('PLATFORM_CATALOG_ADMIN_ID')?.trim();
    if (!id) {
      throw new BadRequestException(
        'PLATFORM_CATALOG_ADMIN_ID must be set in server environment (approved admin UUID for the platform catalogue)',
      );
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'List orders for the platform catalogue shop' })
  list() {
    const id = this.config.get<string>('PLATFORM_CATALOG_ADMIN_ID')?.trim();
    if (!id) return Promise.resolve([]);
    return this.orders.listForAdmin(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one order for the platform catalogue shop' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getAdminOrderById(this.requirePlatformAdminId(), id);
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Ship order (Shiprocket)' })
  ship(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ShipOrderDto) {
    return this.orders.shipOrderForAdmin(this.requirePlatformAdminId(), id, dto);
  }
}
