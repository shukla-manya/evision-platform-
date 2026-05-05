import { Controller, Post, Body, UseGuards, Get, Put, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, SuperadminLoginDto } from './dto/register.dto';
import { UpdateDeviceTokenDto } from './dto/update-device-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateAddressBookDto } from './dto/update-address-book.dto';
import { UpdateGeoDto } from './dto/update-geo.dto';
import { getRequestClientIp } from '../../common/http/client-ip.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email + password → JWT (customer, dealer, electrician)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register customer or dealer with email + password' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('superadmin/login')
  @ApiOperation({ summary: 'Superadmin: email + password → JWT' })
  superadminLogin(@Body() dto: SuperadminLoginDto, @Req() req: Request) {
    return this.authService.superadminLogin(dto, getRequestClientIp(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: { id: string; role: string; email?: string; phone?: string }) {
    const profile = await this.authService.getMeProfile(user);
    return { user: profile };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/device-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save current user device FCM token for push notifications' })
  updateDeviceToken(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateDeviceTokenDto,
  ) {
    return this.authService.updateDeviceToken(user.id, dto.fcm_token);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'dealer')
  @Put('me/address-book')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace saved delivery addresses for checkout' })
  replaceAddressBook(@CurrentUser() user: { id: string }, @Body() dto: UpdateAddressBookDto) {
    return this.authService.replaceAddressBook(user.id, dto.addresses);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'dealer')
  @Patch('me/geo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update last-known coordinates' })
  updateGeo(@CurrentUser() user: { id: string }, @Body() dto: UpdateGeoDto) {
    return this.authService.updateShopperGeo(user.id, dto.lat, dto.lng);
  }
}
