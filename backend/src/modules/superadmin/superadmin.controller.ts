import { Controller, Get, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SuperadminService } from './superadmin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class RejectReasonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

class ReviewElectricianDto {
  @ApiPropertyOptional({ example: 'approve', description: 'approve or reject' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'Aadhar verification failed' })
  @IsOptional()
  @IsString()
  reason?: string;
}

class PlatformCommissionDto {
  @ApiProperty({ example: 10, description: 'Percent of each order retained by platform' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  platform_commission_pct: number;
}

@ApiTags('Superadmin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('superadmin')
export class SuperadminController {
  constructor(private superadminService: SuperadminService) {}

  @Get('pending-admins')
  @ApiOperation({ summary: 'List all pending admin registrations' })
  getPendingAdmins() {
    return this.superadminService.getPendingAdmins();
  }

  @Get('all-admins')
  @ApiOperation({ summary: 'List all admins with status' })
  getAllAdmins() {
    return this.superadminService.getAllAdmins();
  }

  @Put('admin/:id/approve')
  @ApiOperation({ summary: 'Approve an admin registration' })
  approveAdmin(@Param('id') id: string) {
    return this.superadminService.approveAdmin(id);
  }

  @Put('admin/:id/reject')
  @ApiOperation({ summary: 'Reject an admin registration' })
  rejectAdmin(@Param('id') id: string, @Body() dto: RejectReasonDto) {
    return this.superadminService.rejectAdmin(id, dto.reason);
  }

  @Put('admin/:id/suspend')
  @ApiOperation({ summary: 'Toggle suspend/reactivate an admin' })
  suspendAdmin(@Param('id') id: string) {
    return this.superadminService.suspendAdmin(id);
  }

  @Put('admin/:id/commission')
  @ApiOperation({ summary: 'Set platform commission percent for a shop' })
  setCommission(@Param('id') id: string, @Body() dto: PlatformCommissionDto) {
    return this.superadminService.setPlatformCommission(id, dto.platform_commission_pct);
  }

  @Put('admin/:id/mark-settled')
  @ApiOperation({ summary: 'Mark current settlement period as paid for a shop' })
  markSettled(@Param('id') id: string) {
    return this.superadminService.markShopSettled(id);
  }

  @Get('pending-electricians')
  @ApiOperation({ summary: 'List all pending electrician registrations' })
  getPendingElectricians() {
    return this.superadminService.getPendingElectricians();
  }

  @Get('pending-dealer-gst')
  @ApiOperation({ summary: 'List dealers awaiting GST verification (wholesale pricing inactive)' })
  listPendingDealerGst() {
    return this.superadminService.listPendingDealerGst();
  }

  @Put('users/:userId/verify-dealer-gst')
  @ApiOperation({ summary: 'Mark a dealer user as GST-verified (enables wholesale pricing)' })
  verifyDealerGst(@Param('userId') userId: string) {
    return this.superadminService.verifyDealerGst(userId);
  }

  @Put('electrician/:id/approve')
  @ApiOperation({ summary: 'Approve or reject electrician registration' })
  approveElectrician(
    @Param('id') id: string,
    @Body() dto: ReviewElectricianDto,
  ) {
    const action = dto.action === 'reject' ? 'reject' : 'approve';
    return this.superadminService.reviewElectrician(id, action, dto.reason);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Platform analytics overview' })
  getAnalytics() {
    return this.superadminService.getAnalytics();
  }

  @Get('settlements')
  @ApiOperation({ summary: 'Payment settlements summary and per-shop rows' })
  getSettlements() {
    return this.superadminService.getSettlements();
  }

  @Get('reviews')
  @ApiOperation({ summary: 'List all customer reviews (moderation)' })
  listReviews() {
    return this.superadminService.listReviews();
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Permanently delete a review' })
  deleteReview(@Param('id') id: string) {
    return this.superadminService.deleteReview(id);
  }

  @Get('email-logs')
  @ApiOperation({ summary: 'View email delivery history with optional filters' })
  @ApiQuery({ name: 'event', required: false })
  @ApiQuery({ name: 'status', required: false, description: 'sent or failed' })
  @ApiQuery({ name: 'to_role', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  getEmailLogs(
    @Query('event') event?: string,
    @Query('status') status?: string,
    @Query('to_role') to_role?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
  ) {
    return this.superadminService.getEmailLogs({ event, status, to_role, date_from, date_to });
  }
}
