import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DynamoModule } from './common/dynamo/dynamo.module';
import { S3Module } from './common/s3/s3.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { EmailModule } from './modules/emails/email.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { PushModule } from './modules/push/push.module';
import { ElectricianModule } from './modules/electrician/electrician.module';
import { ServiceModule } from './modules/service/service.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { LocationModule } from './modules/location/location.module';
import { GeoModule } from './modules/geo/geo.module';
import { ContactModule } from './modules/contact/contact.module';
import { AppController } from './app.controller';
import { AdminService } from './modules/admin/admin.service';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DynamoModule,
    S3Module,
    EmailModule,
    PushModule,
    AuthModule,
    AdminModule,
    SuperadminModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    InvoicesModule,
    CartModule,
    CheckoutModule,
    ElectricianModule,
    ServiceModule,
    ReviewsModule,
    LocationModule,
    GeoModule,
    ContactModule,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const id = this.configService.get<string>('PLATFORM_CATALOG_ADMIN_ID')?.trim();
    if (id) {
      await this.adminService.ensurePlatformCatalogAdmin(id);
      this.logger.log(`Platform catalogue admin row ensured (${id})`);
    } else {
      this.logger.warn(
        'PLATFORM_CATALOG_ADMIN_ID is not set — set it to a fixed UUID and restart so the public catalogue can be restricted to superadmin-managed products.',
      );
    }
  }
}
