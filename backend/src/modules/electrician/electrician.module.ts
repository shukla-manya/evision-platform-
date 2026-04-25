import { Module } from '@nestjs/common';
import { ElectricianController } from './electrician.controller';
import { ElectricianService } from './electrician.service';
import { ServiceModule } from '../service/service.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [ServiceModule, ReviewsModule],
  controllers: [ElectricianController],
  providers: [ElectricianService],
  exports: [ElectricianService],
})
export class ElectricianModule {}
