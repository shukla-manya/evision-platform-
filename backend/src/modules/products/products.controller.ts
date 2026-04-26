import { Controller, Get, Param, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { ProductsService } from './products.service';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('shops/approved')
  @ApiOperation({ summary: 'List approved partner shops (id + display name) for catalogue filters' })
  @ApiBearerAuth()
  async approvedShops() {
    return this.products.listApprovedShopsPublic();
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({
    summary:
      'List active products (prices: customer → price_customer; dealer → price_dealer when GST verified; admin/superadmin → both). Optional approved_shops_only filters by shop admin approval status.',
  })
  @ApiBearerAuth()
  async list(@Query() query: ListProductsQueryDto, @Req() req: Request) {
    const role = await this.products.effectivePriceRoleFromJwtUser(req.user as { id?: string; role?: string });
    return this.products.listForRole(role, query);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get one product by id' })
  @ApiBearerAuth()
  async getOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const role = await this.products.effectivePriceRoleFromJwtUser(req.user as { id?: string; role?: string });
    return this.products.findByIdForRole(id, role);
  }
}
