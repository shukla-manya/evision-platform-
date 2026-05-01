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
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductsService } from './products.service';
import { S3Service } from '../../common/s3/s3.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Superadmin Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('superadmin/products')
export class ProductsSuperadminController {
  constructor(
    private products: ProductsService,
    private s3: S3Service,
    private config: ConfigService,
  ) {}

  /** Mutations require a fixed platform catalogue admin UUID in env. */
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
  @ApiOperation({ summary: 'List platform catalogue products (customer + dealer prices)' })
  list() {
    const id = this.config.get<string>('PLATFORM_CATALOG_ADMIN_ID')?.trim();
    if (!id) return Promise.resolve([]);
    return this.products.listMine(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one platform catalogue product by id' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.getMineById(this.requirePlatformAdminId(), id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create catalogue product (multipart field `images` optional)' })
  create(@Body() dto: CreateProductDto, @UploadedFiles() files?: Express.Multer.File[]) {
    return this.products.create(this.requirePlatformAdminId(), dto, files);
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update catalogue product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.products.update(this.requirePlatformAdminId(), id, dto, files);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete catalogue product and its images' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(this.requirePlatformAdminId(), id).then(() => ({ deleted: true, id }));
  }

  @Post('images/upload')
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product images to S3; returns URLs for create/update body' })
  async uploadImages(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No image files (field name: images)');
    const urls = await Promise.all(
      files.map((f) => this.s3.upload(f.buffer, f.mimetype, 'products')),
    );
    return { urls };
  }
}
