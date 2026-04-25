import { Controller, Get, Param, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { ProductsService } from './products.service';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import type { PriceViewerRole } from './utils/product-serializer';

function priceRoleFromRequest(user?: { role?: string }): PriceViewerRole {
  if (!user?.role) return 'guest';
  return user.role as PriceViewerRole;
}

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({
    summary:
      'List active products from all shops (prices: customer → price_customer; dealer → price_dealer; admin/superadmin → both)',
  })
  @ApiBearerAuth()
  list(@Query() query: ListProductsQueryDto, @Req() req: Request) {
    return this.products.listForRole(priceRoleFromRequest(req.user), query);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get one product by id' })
  @ApiBearerAuth()
  getOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.products.findByIdForRole(id, priceRoleFromRequest(req.user));
  }
}
