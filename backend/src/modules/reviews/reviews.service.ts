import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { S3Service } from '../../common/s3/s3.service';
import { EmailService } from '../emails/email.service';
import { CreateElectricianReviewDto } from './dto/create-electrician-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private dynamo: DynamoService,
    private s3: S3Service,
    private email: EmailService,
  ) {}

  private reviewsTable() {
    return this.dynamo.tableName('reviews');
  }

  private electriciansTable() {
    return this.dynamo.tableName('electricians');
  }

  async createForElectrician(
    userId: string,
    electricianId: string,
    dto: CreateElectricianReviewDto,
    photo?: Express.Multer.File,
  ): Promise<Record<string, unknown>> {
    const electrician = await this.dynamo.get(this.electriciansTable(), { id: electricianId });
    if (!electrician) throw new NotFoundException('Electrician not found');
    if (String(electrician.status) !== 'approved') {
      throw new BadRequestException('Cannot review an unapproved electrician');
    }

    let photoUrl: string | null = null;
    if (photo) {
      photoUrl = await this.s3.upload(photo.buffer, photo.mimetype, 'reviews');
    }

    const now = new Date().toISOString();
    const review = {
      id: uuidv4(),
      electrician_id: electricianId,
      customer_id: userId,
      rating: Number(dto.rating),
      comment: dto.comment || null,
      photo_url: photoUrl,
      created_at: now,
      updated_at: now,
    };
    await this.dynamo.put(this.reviewsTable(), review);

    const allReviews = await this.dynamo.query({
      TableName: this.reviewsTable(),
      IndexName: 'ElectricianIndex',
      KeyConditionExpression: 'electrician_id = :eid',
      ExpressionAttributeValues: { ':eid': electricianId },
    });
    const totalReviews = allReviews.length;
    const ratingAvg = totalReviews
      ? allReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews
      : 0;
    await this.dynamo.update(this.electriciansTable(), { id: electricianId }, {
      rating_avg: Number(ratingAvg.toFixed(2)),
      total_reviews: totalReviews,
      rating_count: totalReviews,
      updated_at: now,
    });

    if (electrician.email) {
      await this.email.sendElectricianReviewReceived(String(electrician.email), {
        electricianName: String(electrician.name || 'Electrician'),
        rating: Number(dto.rating),
        comment: dto.comment || '',
      });
    }

    return {
      ...review,
      rating_avg: Number(ratingAvg.toFixed(2)),
      total_reviews: totalReviews,
    };
  }

  async listForElectrician(electricianId: string): Promise<Record<string, unknown>[]> {
    const reviews = await this.dynamo.query({
      TableName: this.reviewsTable(),
      IndexName: 'ElectricianIndex',
      KeyConditionExpression: 'electrician_id = :eid',
      ExpressionAttributeValues: { ':eid': electricianId },
    });
    return reviews.sort(
      (a, b) =>
        new Date(String(b.created_at || 0)).getTime() -
        new Date(String(a.created_at || 0)).getTime(),
    );
  }
}
