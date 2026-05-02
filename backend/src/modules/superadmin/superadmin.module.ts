import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { ElectricianModule } from '../electrician/electrician.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [ElectricianModule, ReviewsModule],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
