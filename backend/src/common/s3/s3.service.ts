import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3: S3Client;
  private bucket: string;
  private cloudfrontDomain: string | null;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'ap-south-1'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = config.get('AWS_S3_BUCKET', 'evision-uploads');
    this.cloudfrontDomain = config.get('CLOUDFRONT_DOMAIN') || null;
  }

  async upload(
    buffer: Buffer,
    mimetype: string,
    folder = 'misc',
  ): Promise<string> {
    const ext = mimetype.split('/')[1] || 'bin';
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    return this.publicUrl(key);
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(url: string): Promise<void> {
    const key = this.keyFromUrl(url);
    if (!key) return;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  // Returns the CloudFront URL when configured, otherwise direct S3 URL.
  private publicUrl(key: string): string {
    if (this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}/${key}`;
    }
    const region = this.config.get('AWS_REGION', 'ap-south-1');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  // Extracts the S3 object key from either a CloudFront or direct S3 URL.
  private keyFromUrl(url: string): string | null {
    try {
      return new URL(url).pathname.substring(1);
    } catch {
      return null;
    }
  }
}
