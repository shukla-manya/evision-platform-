import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/invoices')
export class InvoicesAdminController {
  constructor(private invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices for orders from your shop' })
  list(@CurrentUser() user: { id: string }) {
    return this.invoices.listForAdmin(user.id);
  }
}
