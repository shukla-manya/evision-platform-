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
  ParseUUIDPipe,
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
  listMine(@CurrentUser() user: { id: string }) {
    return this.products.listMine(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one product by id (your shop only). Always returns both price_customer and price_dealer.',
  })
  getMineById(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.getMineById(user.id, id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create product (JSON body, or multipart with image files field `images`)' })
  create(
    @CurrentUser() user: { id: string },
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
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.products.update(user.id, id, dto, files);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product and remove its images from S3' })
  remove(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(user.id, id).then(() => ({ deleted: true, id }));
  }

  @Post('images/upload')
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload product images to S3 (multipart field `images`). Returns public URLs (CloudFront when CLOUDFRONT_DOMAIN is configured) to pass in `images` on create/update.',
  })
  async uploadImages(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No image files (field name: images)');
    const urls = await Promise.all(
      files.map((f) => this.s3.upload(f.buffer, f.mimetype, 'products')),
    );
    return { urls };
  }
}
