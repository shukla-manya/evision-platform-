import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';

@ApiTags('Superadmin Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('superadmin/invoices')
export class InvoicesSuperadminController {
  constructor(
    private invoices: InvoicesService,
    private config: ConfigService,
  ) {}

  private platformAdminId(): string {
    const id = this.config.get<string>('PLATFORM_CATALOG_ADMIN_ID')?.trim();
    if (!id) throw new BadRequestException('PLATFORM_CATALOG_ADMIN_ID must be set');
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'List invoices for platform catalogue orders' })
  list() {
    return this.invoices.listForAdmin(this.platformAdminId());
  }
}
