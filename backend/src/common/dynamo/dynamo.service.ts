import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db, Collection, Document } from 'mongodb';
import { evisionPartitionKeyFields } from './collection-keys';
import {
  mongoFilterFromQueryInput,
  mongoFilterFromScanInput,
  mongoProjectionFromExpression,
  type DynamoLikeQueryInput,
  type DynamoLikeScanInput,
} from './mongo-dynamo-query.util';
import { resolveMongoConnectionString } from './mongo-uri.util';

function stripMongoId(doc: Record<string, unknown> | null | undefined): any {
  if (!doc || typeof doc !== 'object') return doc;
  const { _id, ...rest } = doc;
  void _id;
  return rest;
}

function stripMongoIds(docs: Record<string, unknown>[]): any[] {
  return docs.map((d) => stripMongoId(d));
}

function keyFilter(tableName: string, key: Record<string, unknown>): Record<string, unknown> {
  const fields = evisionPartitionKeyFields(tableName);
  const f: Record<string, unknown> = {};
  for (const k of fields) {
    if (key[k] === undefined) {
      throw new Error(`Missing key field "${k}" for ${tableName}`);
    }
    f[k] = key[k];
  }
  return f;
}

@Injectable()
export class DynamoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DynamoService.name);
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(private config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const uri = resolveMongoConnectionString(
      this.config.get<string>('MONGODB_URI'),
      this.config.get<string>('DATABASE_URL'),
    );
    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db();
      const mongoLine = `MongoDB connected (${this.logUriHint(uri)})`;
      this.logger.log(mongoLine);
      console.log(mongoLine);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`MongoDB connection failed: ${msg}`);
      throw new ServiceUnavailableException(
        'Cannot connect to MongoDB. Set MONGODB_URI (or DATABASE_URL) and ensure the server is running.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
    this.client = null;
    this.db = null;
  }

  private logUriHint(uri: string): string {
    const host = uri.replace(/^mongodb(\+srv)?:\/\//, '').split(/[/:?@]/);
    const h = host.find((x) => x.includes('.') || x === 'localhost' || x === '127.0.0.1');
    return h ? `host ${h}` : 'configured URI';
  }

  private col(table: string): Collection<Document> {
    if (!this.db) throw new Error('MongoDB not initialized');
    return this.db.collection(table);
  }

  private async send<T>(label: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/ECONNREFUSED|ECONNRESET|ENOTFOUND|socket hang up|getaddrinfo|MongoNetworkError|not connected/i.test(msg)) {
        this.logger.error(`MongoDB ${label}: ${msg}`);
        throw new ServiceUnavailableException(
          'Cannot reach MongoDB. Confirm MONGODB_URI and that the database is running.',
        );
      }
      throw e;
    }
  }

  async put(table: string, item: Record<string, any>): Promise<void> {
    const keys = evisionPartitionKeyFields(table);
    const filter = Object.fromEntries(keys.map((k) => [k, item[k]]));
    await this.send('put', () =>
      this.col(table).replaceOne(filter, { ...item } as Document, { upsert: true }),
    );
  }

  async get(table: string, key: Record<string, any>): Promise<any | null> {
    const doc = await this.send('get', () => this.col(table).findOne(keyFilter(table, key)));
    return stripMongoId(doc as Record<string, unknown> | null);
  }

  async update(
    table: string,
    key: Record<string, any>,
    updates: Record<string, any>,
    removeAttrs?: string[],
  ): Promise<any> {
    const filter = keyFilter(table, key);
    const $set: Record<string, unknown> = { ...updates };
    const $unset: Record<string, ''> = {};
    for (const k of removeAttrs || []) {
      if (k) $unset[k] = '';
    }
    const updateDoc: Record<string, unknown> = {};
    if (Object.keys($set).length) updateDoc.$set = $set;
    if (Object.keys($unset).length) updateDoc.$unset = $unset;
    if (!Object.keys(updateDoc).length) {
      throw new Error('DynamoService.update: empty update and remove');
    }
    await this.send('update', async () => {
      const ur = await this.col(table).updateOne(filter, updateDoc);
      if (ur.matchedCount === 0) {
        throw new Error(`DynamoService.update: no document matched ${table} ${JSON.stringify(key)}`);
      }
    });
    const out = await this.col(table).findOne(filter);
    return stripMongoId(out as Record<string, unknown> | null);
  }

  async delete(table: string, key: Record<string, any>): Promise<void> {
    await this.send('delete', () => this.col(table).deleteOne(keyFilter(table, key)));
  }

  async query(params: DynamoLikeQueryInput): Promise<any[]> {
    const { TableName, Limit, ProjectionExpression, ScanIndexForward } = params;
    const filter = mongoFilterFromQueryInput(params);
    const proj = mongoProjectionFromExpression(ProjectionExpression);
    const opts = proj ? { projection: proj } : {};
    let cursor = this.col(TableName).find(filter, opts);
    if (ScanIndexForward === false) cursor = cursor.sort({ _id: -1 });
    else if (ScanIndexForward === true) cursor = cursor.sort({ _id: 1 });
    if (Limit != null && Limit > 0) cursor = cursor.limit(Limit);
    const items = await this.send('query', () => cursor.toArray());
    return stripMongoIds(items as Record<string, unknown>[]);
  }

  async queryAllPages(params: DynamoLikeQueryInput): Promise<any[]> {
    const { TableName, ProjectionExpression } = params;
    const filter = mongoFilterFromQueryInput(params);
    const proj = mongoProjectionFromExpression(ProjectionExpression);
    const opts = proj ? { projection: proj } : {};
    const items = await this.send('queryAllPages', () => this.col(TableName).find(filter, opts).toArray());
    return stripMongoIds(items as Record<string, unknown>[]);
  }

  async scan(params: DynamoLikeScanInput): Promise<any[]> {
    const { TableName, Limit, ProjectionExpression } = params;
    const filter = mongoFilterFromScanInput(params);
    const proj = mongoProjectionFromExpression(ProjectionExpression);
    const opts = proj ? { projection: proj } : {};
    let cursor = this.col(TableName).find(filter, opts);
    if (Limit != null && Limit > 0) cursor = cursor.limit(Limit);
    const items = await this.send('scan', () => cursor.toArray());
    return stripMongoIds(items as Record<string, unknown>[]);
  }

  async scanAllPages(params: DynamoLikeScanInput): Promise<any[]> {
    const { TableName, ProjectionExpression } = params;
    const filter = mongoFilterFromScanInput(params);
    const proj = mongoProjectionFromExpression(ProjectionExpression);
    const opts = proj ? { projection: proj } : {};
    const items = await this.send('scanAllPages', () => this.col(TableName).find(filter, opts).toArray());
    return stripMongoIds(items as Record<string, unknown>[]);
  }

  async queryOne(params: DynamoLikeQueryInput): Promise<any | null> {
    const items = await this.query({ ...params, Limit: 1 });
    return items[0] || null;
  }

  tableName(name: string): string {
    return `evision_${name}`;
  }
}
