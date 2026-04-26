import { Controller, Post, Body, UseGuards, Get, Put, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import {
  RegisterDto,
  AdminLoginDto,
  SuperadminLoginDto,
  PasswordResetStartDto,
  PasswordResetCompleteDto,
} from './dto/register.dto';
import { AdminSetupPasswordDto } from './dto/admin-setup-password.dto';
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
  @Post('send-otp')
  @ApiOperation({
    summary:
      'Send OTP (logged to server console when OTP_CONSOLE_ONLY=true; otherwise Twilio SMS)',
  })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone, { purpose: dto.purpose, email: dto.email });
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({
    summary:
      'Verify OTP → JWT. No role in the request: resolves by phone—`users` (customer/dealer) first, then `electricians` (approved → role electrician; pending → electrician_pending; rejected → electrician_rejected). Unregistered → temp token.',
  })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register customer or dealer (OTP required; no password stored)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('password/reset/start')
  @ApiOperation({ summary: 'Start password reset via phone OTP (shop admin or electrician only)' })
  passwordResetStart(@Body() dto: PasswordResetStartDto) {
    return this.authService.passwordResetStart(dto);
  }

  @Public()
  @Post('password/reset/complete')
  @ApiOperation({ summary: 'Complete password reset with OTP (shop admin or electrician only)' })
  passwordResetComplete(@Body() dto: PasswordResetCompleteDto) {
    return this.authService.passwordResetComplete(dto);
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({
    summary:
      'Shop admin: email + password → JWT (approved only; use approval email link to set password the first time)',
  })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Public()
  @Post('admin/setup-password')
  @ApiOperation({ summary: 'One-time: set password using JWT from approval email, then use admin/login' })
  adminSetupPassword(@Body() dto: AdminSetupPasswordDto) {
    return this.authService.adminSetupPasswordFromInvite(dto);
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
  @ApiOperation({ summary: 'Update last-known coordinates (e.g. after enabling location in settings)' })
  updateGeo(@CurrentUser() user: { id: string }, @Body() dto: UpdateGeoDto) {
    return this.authService.updateShopperGeo(user.id, dto.lat, dto.lng);
  }
}
