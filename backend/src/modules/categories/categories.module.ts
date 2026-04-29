import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesSuperadminController } from './categories.superadmin.controller';

@Module({
  controllers: [CategoriesController, CategoriesSuperadminController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
