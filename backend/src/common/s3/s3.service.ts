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
  /** e.g. http://localhost:9000 — MinIO / LocalStack S3 API */
  private readonly s3Endpoint: string | undefined;
  /** Public base for returned URLs (browser). Defaults to path-style `${endpoint}/${bucket}` when endpoint is set. */
  private readonly s3PublicBase: string | undefined;
  /** True when running locally with placeholder creds and no S3 endpoint — uploads return a stub URL. */
  private readonly s3Disabled: boolean;

  constructor(private config: ConfigService) {
    this.region = config.get('AWS_REGION', 'ap-south-1');
    this.bucket = config.get('AWS_S3_BUCKET', 'evision-uploads');
    this.s3Endpoint = (config.get('S3_ENDPOINT') || '').trim() || undefined;
    this.s3PublicBase = (config.get('S3_PUBLIC_BASE_URL') || '').trim() || undefined;
    const isLocal = Boolean(this.s3Endpoint);
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    /** Same dummy pair used in local e2e — must not be sent to real AWS S3. */
    const isPlaceholderLocalCreds =
      accessKeyId === 'local' && secretAccessKey === 'local';
    const credentials =
      isLocal
        ? {
            accessKeyId: accessKeyId || 'minioadmin',
            secretAccessKey: secretAccessKey || 'minioadmin',
          }
        : accessKeyId && secretAccessKey && !isDynamoLocalStyleCreds
          ? { accessKeyId, secretAccessKey }
          : undefined;

    this.s3 = new S3Client({
      region: this.region,
      endpoint: this.s3Endpoint,
      forcePathStyle: isLocal,
      ...(credentials ? { credentials } : {}),
    });
    this.cloudfrontDomain = (config.get('CLOUDFRONT_DOMAIN') || '').replace(/\/$/, '') || null;

    this.s3Disabled = !isLocal && isDynamoLocalStyleCreds;
    if (this.s3Disabled) {
      this.logger.warn(
        'AWS_ACCESS_KEY_ID/SECRET are the DynamoDB-local placeholder (local/local); ' +
          'they are not used for S3. Set S3_ENDPOINT (e.g. MinIO) for local uploads, or use real AWS credentials / ~/.aws. ' +
          'S3 uploads are DISABLED — stub URLs will be returned in local dev mode.',
      );
    }

    this.logger.log(
      isLocal
        ? `S3 client (local) API=${this.s3Endpoint} bucket=${this.bucket} path-style=true`
        : `S3 client (AWS) bucket=${this.bucket}`,
    );
  }

  /**
   * Upload a file to S3. Returns a **public** URL: CloudFront when `CLOUDFRONT_DOMAIN` is set,
   * else local path-style URL when `S3_ENDPOINT` is set, else regional virtual-hosted S3 URL.
   */
  async upload(
    buffer: Buffer,
    mimetype: string,
    folder = 'misc',
  ): Promise<string> {
    const ext = mimetype.split('/')[1] || 'bin';
    const key = `${folder}/${uuidv4()}.${ext}`;

    if (this.s3Disabled) {
      const stubUrl = `local-dev://${this.bucket}/${key}`;
      this.logger.warn(`S3 disabled (local dev) — returning stub URL: ${stubUrl}`);
      return stubUrl;
    }

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

  /** Deletes the object referenced by a stored URL (S3, MinIO path-style, or CloudFront with same path/key). */
  async delete(url: string): Promise<void> {
    const key = this.extractObjectKey(url);
    if (!key) return;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

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

  /**
   * Object key for S3 DeleteObject. Supports virtual-hosted AWS URLs, path-style MinIO
   * (`http://host/bucket/key`), and keys stored without host.
   */
  extractObjectKey(url: string): string | null {
    try {
      const trimmed = url.trim();
      if (!trimmed.includes('://')) {
        const k = trimmed.replace(/^\//, '');
        return k || null;
      }
      const u = new URL(trimmed);
      let path = u.pathname.replace(/^\//, '');
      if (path.startsWith(`${this.bucket}/`)) {
        path = path.slice(this.bucket.length + 1);
      }
      return path || null;
    } catch {
      return null;
    }
  }

  private publicUrlForKey(key: string): string {
    if (this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}/${key}`;
    }
    if (this.s3PublicBase) {
      return `${this.s3PublicBase.replace(/\/$/, '')}/${key}`;
    }
    if (this.s3Endpoint) {
      return `${this.s3Endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
