import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ProductReviewsService } from './product-reviews.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, ProductReviewsService],
  exports: [ReviewsService, ProductReviewsService],
})
export class ReviewsModule {}
