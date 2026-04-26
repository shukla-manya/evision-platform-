import { Module } from '@nestjs/common';
import { ElectricianController } from './electrician.controller';
import { ElectricianService } from './electrician.service';
import { ServiceModule } from '../service/service.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, ServiceModule, ReviewsModule],
  controllers: [ElectricianController],
  providers: [ElectricianService],
  exports: [ElectricianService],
})
export class ElectricianModule {}
