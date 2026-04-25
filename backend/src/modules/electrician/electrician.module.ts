import { Module } from '@nestjs/common';
import { ElectricianController } from './electrician.controller';
import { ElectricianService } from './electrician.service';

@Module({
  controllers: [ElectricianController],
  providers: [ElectricianService],
  exports: [ElectricianService],
})
export class ElectricianModule {}
