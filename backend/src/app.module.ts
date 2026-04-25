import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
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
  ],
})
export class AppModule {}
