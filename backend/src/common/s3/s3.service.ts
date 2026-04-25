import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

/** Folders we upload under — used to decide if a URL can be rewritten to CloudFront. */
const REWRITABLE_PREFIXES = ['products/', 'logos/', 'misc/'];

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3: S3Client;
  private bucket: string;
  private cloudfrontDomain: string | null;
  private region: string;

  constructor(private config: ConfigService) {
    this.region = config.get('AWS_REGION', 'ap-south-1');
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = config.get('AWS_S3_BUCKET', 'evision-uploads');
    this.cloudfrontDomain = (config.get('CLOUDFRONT_DOMAIN') || '').replace(/\/$/, '') || null;
  }

  /**
   * Upload a file to S3. Returns a **public** URL: CloudFront when `CLOUDFRONT_DOMAIN` is set,
   * otherwise the regional virtual-hosted–style S3 URL (stored in `product.images[]`).
   */
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

    const url = this.publicUrlForKey(key);
    this.logger.debug(`Uploaded s3://${this.bucket}/${key} → ${url}`);
    return url;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /** Deletes the object referenced by a stored URL (S3 or CloudFront with same path/key). */
  async delete(url: string): Promise<void> {
    const key = this.extractObjectKey(url);
    if (!key) return;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /**
   * When CloudFront is configured, rewrites known app asset URLs (same bucket keys) to the CDN
   * so clients always load images from the edge. External URLs are left unchanged.
   */
  mapPublicImageUrls(urls?: string[] | null): string[] | undefined {
    if (!urls?.length) return urls ?? undefined;
    return urls.map((u) => this.rewriteToConfiguredCdn(u));
  }

  rewriteToConfiguredCdn(url: string | null | undefined): string | null | undefined {
    if (url == null || url === '') return url;
    if (!this.cloudfrontDomain) return url;
    const key = this.extractObjectKey(url);
    if (!key || !REWRITABLE_PREFIXES.some((p) => key.startsWith(p))) return url;
    if (url.includes(this.cloudfrontDomain)) return url;
    return `https://${this.cloudfrontDomain}/${key}`;
  }

  extractObjectKey(url: string): string | null {
    try {
      const pathname = new URL(url).pathname.replace(/^\//, '');
      return pathname || null;
    } catch {
      return null;
    }
  }

  private publicUrlForKey(key: string): string {
    if (this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
