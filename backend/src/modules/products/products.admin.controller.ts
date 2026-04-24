import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { S3Service } from '../../common/s3/s3.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/products')
export class ProductsAdminController {
  constructor(
    private products: ProductsService,
    private s3: S3Service,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List products for your shop (both prices, stock flags)' })
  listMine(@CurrentUser() user: any) {
    return this.products.listMine(user.id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create product (JSON body, or multipart with image files field `images`)' })
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.products.create(user.id, dto, files);
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update product (append images when multipart files sent; body.images replaces list when provided)' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.products.update(user.id, id, dto, files);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.products.remove(user.id, id).then(() => ({ deleted: true, id }));
  }

  @Post('images/upload')
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload one or more images to S3; returns URLs for JSON create/update payloads' })
  async uploadImages(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No image files (field name: images)');
    const urls = await Promise.all(
      files.map((f) => this.s3.upload(f.buffer, f.mimetype, 'products')),
    );
    return { urls };
  }
}
