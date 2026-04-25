import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { AdminModule } from '../admin/admin.module';
import { ElectricianModule } from '../electrician/electrician.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [AdminModule, ElectricianModule, ReviewsModule],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
