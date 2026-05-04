import { Controller, Post, Body, UseGuards, Get, Put, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto, SuperadminLoginDto, PasswordResetStartDto, PasswordResetCompleteDto } from './dto/register.dto';
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
      'Send 6-digit OTP to email. Uses SMTP (Nodemailer) by default; set EMAIL_TRANSPORT=ses for Amazon SES. OTP_CONSOLE_ONLY=true logs the code only (no email), for local dev.',
  })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.email, { purpose: dto.purpose });
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({
    summary:
      'Verify OTP → JWT. Resolves by email: `users` (customer/dealer) first, then `electricians`. Unregistered email → temporary JWT for signup.',
  })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register customer or dealer (OTP required; no password stored)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('password/reset/start')
  @ApiOperation({ summary: 'Start password reset via email OTP (technician accounts only)' })
  passwordResetStart(@Body() dto: PasswordResetStartDto) {
    return this.authService.passwordResetStart(dto);
  }

  @Public()
  @Post('password/reset/complete')
  @ApiOperation({ summary: 'Complete password reset with OTP (technician accounts only)' })
  passwordResetComplete(@Body() dto: PasswordResetCompleteDto) {
    return this.authService.passwordResetComplete(dto);
  }

  @Public()
  @Post('superadmin/login')
  @ApiOperation({
    summary: 'Superadmin: email + password → JWT',
    description:
      'Issues a session-bound token. Any previous superadmin token is invalidated. Requests must come from the same client IP as login (set TRUST_PROXY when behind a reverse proxy).',
  })
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
