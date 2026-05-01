import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeoService } from './geo.service';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('reverse')
  @ApiOperation({
    summary: 'Reverse geocode lat/lng (India-friendly via OpenStreetMap Nominatim)',
    description: 'Public endpoint for registration and forms; rate-limit at the edge in production.',
  })
  async reverse(@Query('lat') latQ: string, @Query('lng') lngQ: string) {
    const lat = Number.parseFloat(String(latQ ?? '').trim());
    const lng = Number.parseFloat(String(lngQ ?? '').trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Query params lat and lng must be valid numbers');
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('lat/lng out of range');
    }
    const out = await this.geo.reverseIndia(lat, lng);
    if (!out) {
      throw new BadRequestException('Could not resolve address for these coordinates');
    }
    return out;
  }
}
