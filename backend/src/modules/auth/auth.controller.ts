import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import {
  RegisterDto,
  AdminLoginDto,
  SuperadminLoginDto,
  LoginOtpVerifyDto,
  ElectricianLoginDto,
  MobileLoginDto,
  PasswordResetStartDto,
  PasswordResetCompleteDto,
} from './dto/register.dto';
import { UpdateDeviceTokenDto } from './dto/update-device-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
    return this.authService.sendOtp(dto.phone);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP → returns JWT. is_registered=false means user must register next.' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register customer/dealer/electrician (OTP required in payload)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('mobile/login')
  @ApiOperation({ summary: 'Mobile login step 1: email + password, then send OTP to linked phone' })
  mobileLogin(@Body() dto: MobileLoginDto) {
    return this.authService.mobileLogin(dto);
  }

  @Public()
  @Post('mobile/login/verify')
  @ApiOperation({ summary: 'Mobile login step 2: verify OTP and issue JWT for app role' })
  mobileLoginVerify(@Body() dto: LoginOtpVerifyDto) {
    return this.authService.mobileLoginVerify(dto);
  }

  @Public()
  @Post('password/reset/start')
  @ApiOperation({ summary: 'Start password reset via phone OTP (superadmin excluded)' })
  passwordResetStart(@Body() dto: PasswordResetStartDto) {
    return this.authService.passwordResetStart(dto);
  }

  @Public()
  @Post('password/reset/complete')
  @ApiOperation({ summary: 'Complete password reset with OTP verification (superadmin excluded)' })
  passwordResetComplete(@Body() dto: PasswordResetCompleteDto) {
    return this.authService.passwordResetComplete(dto);
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login step 1: verify password, send OTP to admin phone' })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Public()
  @Post('admin/login/verify')
  @ApiOperation({ summary: 'Admin login step 2: verify OTP and issue JWT' })
  adminLoginVerify(@Body() dto: LoginOtpVerifyDto) {
    return this.authService.adminLoginVerify(dto);
  }

  @Public()
  @Post('superadmin/login')
  @ApiOperation({ summary: 'Superadmin login step 1: verify password, send OTP' })
  superadminLogin(@Body() dto: SuperadminLoginDto) {
    return this.authService.superadminLogin(dto);
  }

  @Public()
  @Post('superadmin/login/verify')
  @ApiOperation({ summary: 'Superadmin login step 2: verify OTP and issue JWT' })
  superadminLoginVerify(@Body() dto: LoginOtpVerifyDto) {
    return this.authService.superadminLoginVerify(dto);
  }

  @Public()
  @Post('electrician/login')
  @ApiOperation({ summary: 'Electrician login with email + password → returns JWT' })
  electricianLogin(@Body() dto: ElectricianLoginDto) {
    return this.authService.electricianLogin(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  me(@CurrentUser() user: any) {
    return { user };
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
}
