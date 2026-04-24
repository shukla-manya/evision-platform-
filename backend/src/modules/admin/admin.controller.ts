import { Controller, Post, Get, Put, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { S3Service } from '../../common/s3/s3.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private s3Service: S3Service,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Admin self-registration → status=PENDING, email sent to superadmin' })
  register(@Body() dto: RegisterAdminDto) {
    return this.adminService.register(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin profile' })
  getMe(@CurrentUser() user: any) {
    return this.adminService.getById(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload shop logo to S3' })
  async uploadLogo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    const url = await this.s3Service.upload(file.buffer, file.mimetype, 'logos');
    return this.adminService.updateLogoUrl(user.id, url);
  }
}
