import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsSuperadminController } from './products.superadmin.controller';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@Module({
  imports: [AuthModule, CategoriesModule],
  controllers: [ProductsController, ProductsSuperadminController],
  providers: [ProductsService, OptionalJwtAuthGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
