import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all categories (for filters & product forms)' })
  list() {
    return this.categories.listAll();
  }
}
