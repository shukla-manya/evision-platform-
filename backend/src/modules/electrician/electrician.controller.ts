import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { S3Service } from '../../common/s3/s3.service';
import { Public } from '../../common/decorators/public.decorator';
import { RegisterElectricianDto } from './dto/register-electrician.dto';
import { ElectricianService } from './electrician.service';
import { ServiceService } from '../service/service.service';
import { RespondBookingDto } from '../service/dto/respond-booking.dto';
import { UpdateJobStatusDto } from '../service/dto/update-job-status.dto';
import { UpdateElectricianAvailabilityDto } from '../service/dto/update-electrician-availability.dto';
import { ReviewsService } from '../reviews/reviews.service';
import { UpdateElectricianDeviceTokenDto } from './dto/update-device-token.dto';
import { UpdateGeoDto } from '../auth/dto/update-geo.dto';

@ApiTags('Electrician')
@Controller(['electrician', 'electricians'])
export class ElectricianController {
  constructor(
    private electrician: ElectricianService,
    private s3: S3Service,
    private service: ServiceService,
    private reviews: ReviewsService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician', 'electrician_pending', 'electrician_rejected')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current electrician profile (pending/rejected: read-only gate)' })
  getMe(@CurrentUser() user: { id: string }) {
    return this.electrician.getMe(user.id);
  }

  @Public()
  @Get('nearby')
  @ApiQuery({ name: 'lat', required: true, example: '28.4089' })
  @ApiQuery({ name: 'lng', required: true, example: '77.3178' })
  @ApiOperation({
    summary:
      'Find approved & available electricians within 10km sorted by rating_avg desc',
  })
  nearby(
    @Query('lat') latRaw: string,
    @Query('lng') lngRaw: string,
  ) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('lat and lng query params are required');
    }
    return this.electrician.findNearbyApprovedAvailable(lat, lng, 10);
  }

  @Public()
  @Get(':id/profile')
  @ApiOperation({ summary: 'Public electrician profile with all reviews' })
  async profile(@Param('id') electricianId: string) {
    return this.electrician.getPublicProfile(electricianId, this.reviews);
  }

  @Public()
  @Post('register')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'phone', 'email', 'otp', 'lat', 'lng', 'aadhar', 'photo'],
      properties: {
        name: { type: 'string', example: 'Ravi Kumar' },
        phone: { type: 'string', example: '+919876543210' },
        otp: { type: 'string', example: '482931', description: '6-digit OTP from /auth/send-otp' },
        email: { type: 'string', example: 'ravi@example.com' },
        password: { type: 'string', example: 'SecurePass@123', description: 'Optional' },
        address: { type: 'string', example: 'Sector 15, Faridabad' },
        lat: { type: 'string', example: '28.4089' },
        lng: { type: 'string', example: '77.3178' },
        skills: { type: 'string', example: 'wiring,solar,inverter' },
        aadhar: { type: 'string', format: 'binary' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Electrician self-registration with Aadhar + photo upload to S3 (status=pending)',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'aadhar', maxCount: 1 },
      { name: 'photo', maxCount: 1 },
    ]),
  )
  async register(
    @Body() dto: RegisterElectricianDto,
    @UploadedFiles()
    files: {
      aadhar?: Express.Multer.File[];
      photo?: Express.Multer.File[];
    },
  ) {
    const aadharFile = files?.aadhar?.[0];
    const photoFile = files?.photo?.[0];
    const [aadharUrl, photoUrl] = await Promise.all([
      aadharFile ? this.s3.upload(aadharFile.buffer, aadharFile.mimetype, 'electricians/aadhar') : Promise.resolve(null),
      photoFile ? this.s3.upload(photoFile.buffer, photoFile.mimetype, 'electricians/photos') : Promise.resolve(null),
    ]);
    return this.electrician.register(dto, {
      aadhar_url: aadharUrl,
      photo_url: photoUrl,
    });
  }

  @Put('booking/:id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Electrician accepts or declines a pending booking' })
  respondToBooking(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
    @Body() dto: RespondBookingDto,
  ) {
    return this.service.respondToBooking(user.id, bookingId, dto);
  }

  @Put('job/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update job status (on_the_way/reached/work_started/completed) and notify client',
  })
  updateJobStatus(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.service.updateJobStatus(user.id, bookingId, dto);
  }

  @Get('bookings/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending service bookings for current electrician' })
  listPendingBookings(@CurrentUser() user: { id: string }) {
    return this.service.listElectricianBookings(user.id, 'pending');
  }

  @Get('bookings/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active service jobs for current electrician' })
  listActiveBookings(@CurrentUser() user: { id: string }) {
    return this.service.listElectricianBookings(user.id, 'active');
  }

  @Get('my/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all bookings for current electrician' })
  listMyBookings(@CurrentUser() user: { id: string }) {
    return this.electrician.getMyBookings(user.id);
  }

  @Get('my/active-booking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currently active booking for current electrician' })
  getMyActiveBooking(@CurrentUser() user: { id: string }) {
    return this.electrician.getMyActiveBooking(user.id);
  }

  @Get('bookings/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List completed service jobs for current electrician' })
  listHistoryBookings(@CurrentUser() user: { id: string }) {
    return this.service.listElectricianBookings(user.id, 'history');
  }

  @Put('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set electrician online/offline availability' })
  setAvailability(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateElectricianAvailabilityDto,
  ) {
    return this.service.setElectricianAvailability(user.id, dto.online);
  }

  @Patch('me/geo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update base coordinates used for nearby discovery' })
  updateGeo(@CurrentUser() user: { id: string }, @Body() dto: UpdateGeoDto) {
    return this.electrician.updateGeoCoords(user.id, dto.lat, dto.lng);
  }

  @Post('my/device-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save electrician device FCM token' })
  updateDeviceToken(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateElectricianDeviceTokenDto,
  ) {
    return this.electrician.updateFcmToken(user.id, dto.fcm_token);
  }

  @Post('job/:id/photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('electrician')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload work completion photo for a booking' })
  @UseInterceptors(FileInterceptor('photo'))
  uploadJobPhoto(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return this.service.uploadJobPhoto(user.id, bookingId, photo);
  }
}
