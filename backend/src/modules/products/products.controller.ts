import { Controller, Get, Param, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { ProductsService } from './products.service';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductReviewsService } from '../reviews/product-reviews.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private products: ProductsService,
    private productReviews: ProductReviewsService,
  ) {}

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
  @Get('home-showcase')
  @ApiOperation({
    summary:
      'Homepage showcase products (Advanced CCTV grid + combos row) curated via superadmin product fields `home_showcase_*` on the platform catalogue.',
  })
  @ApiBearerAuth()
  async homeShowcase() {
    return this.products.listHomeShowcaseForPublic();
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/reviews')
  @ApiOperation({ summary: 'List customer reviews for a product (public)' })
  @ApiBearerAuth()
  async productReviews(@Param('id', ParseUUIDPipe) id: string) {
    return this.productReviews.listForProductPublic(id);
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
