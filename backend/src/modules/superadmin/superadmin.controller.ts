import { Controller, Get, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
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

  @Get('pending-electricians')
  @ApiOperation({ summary: 'List all pending electrician registrations' })
  getPendingElectricians() {
    return this.superadminService.getPendingElectricians();
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

  @Get('email-logs')
  @ApiOperation({ summary: 'View all email logs' })
  @ApiQuery({ name: 'event', required: false })
  getEmailLogs(@Query('event') event?: string) {
    return this.superadminService.getEmailLogs(event);
  }
}
