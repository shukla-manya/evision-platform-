import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BookServiceDto } from './dto/book-service.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { ServiceService } from './service.service';

@ApiTags('Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service')
export class ServiceController {
  constructor(private service: ServiceService) {}

  @Post('request')
  @Roles('customer', 'dealer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Create service request with issue, photo, preferred schedule, and location',
  })
  @UseInterceptors(FileInterceptor('photo'))
  createRequest(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateServiceRequestDto,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return this.service.createRequest(user.id, dto, photo);
  }

  @Post('book/:electricianId')
  @Roles('customer', 'dealer')
  @ApiOperation({
    summary:
      'Book electrician for a service request; booking expires in 2 hours if pending',
  })
  bookElectrician(
    @CurrentUser() user: { id: string },
    @Param('electricianId') electricianId: string,
    @Body() dto: BookServiceDto,
  ) {
    return this.service.bookElectrician(user.id, electricianId, dto);
  }
}
