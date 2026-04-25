import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'dealer')
@Controller('cart')
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'List cart grouped by admin_id (shop)' })
  list(@CurrentUser() user: { id: string }) {
    return this.cart.getGroupedCart(user.id);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add product to cart with price_at_time and product shop info' })
  add(@CurrentUser() user: { id: string; role: 'customer' | 'dealer' }, @Body() dto: AddToCartDto) {
    return this.cart.add(user.id, user.role, dto);
  }

  @Delete(':itemId')
  @ApiOperation({ summary: 'Remove one cart item' })
  remove(@CurrentUser() user: { id: string }, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.cart.remove(user.id, itemId).then(() => ({ deleted: true, id: itemId }));
  }
}
