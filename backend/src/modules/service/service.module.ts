import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { AuthModule } from '../auth/auth.module';
import { ServiceTrackingGateway } from './service-tracking.gateway';

@Module({
  imports: [AuthModule],
  controllers: [ServiceController],
  providers: [ServiceService, ServiceTrackingGateway],
  exports: [ServiceService],
})
export class ServiceModule {}
