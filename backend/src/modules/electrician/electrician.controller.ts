import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { S3Service } from '../../common/s3/s3.service';
import { Public } from '../../common/decorators/public.decorator';
import { RegisterElectricianDto } from './dto/register-electrician.dto';
import { ElectricianService } from './electrician.service';

@ApiTags('Electrician')
@Controller(['electrician', 'electricians'])
export class ElectricianController {
  constructor(
    private electrician: ElectricianService,
    private s3: S3Service,
  ) {}

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
  @Post('register')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'name',
        'phone',
        'email',
        'password',
        'lat',
        'lng',
        'aadhar',
        'photo',
      ],
      properties: {
        name: { type: 'string', example: 'Ravi Kumar' },
        phone: { type: 'string', example: '+919876543210' },
        email: { type: 'string', example: 'ravi@example.com' },
        password: { type: 'string', example: 'SecurePass@123' },
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
    if (!aadharFile || !photoFile) {
      throw new BadRequestException('aadhar and photo files are required');
    }
    const [aadharUrl, photoUrl] = await Promise.all([
      this.s3.upload(aadharFile.buffer, aadharFile.mimetype, 'electricians/aadhar'),
      this.s3.upload(photoFile.buffer, photoFile.mimetype, 'electricians/photos'),
    ]);
    return this.electrician.register(dto, {
      aadhar_url: aadharUrl,
      photo_url: photoUrl,
    });
  }
}
