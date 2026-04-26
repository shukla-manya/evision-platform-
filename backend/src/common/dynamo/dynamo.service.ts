import { Injectable, OnModuleInit, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  QueryCommandInput,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoService implements OnModuleInit {
  private readonly logger = new Logger(DynamoService.name);
  private client: DynamoDBDocumentClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const endpoint =
      this.config.get('DYNAMODB_ENDPOINT') ||
      this.config.get('DYNAMO_ENDPOINT') ||
      undefined;
    const isLocal = Boolean(endpoint);
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    const credentials =
      isLocal
        ? {
            accessKeyId: accessKeyId || 'local',
            secretAccessKey: secretAccessKey || 'local',
          }
        : accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined;

    const raw = new DynamoDBClient({
      region: this.config.get('AWS_REGION', 'ap-south-1'),
      ...(credentials ? { credentials } : {}),
      ...(endpoint ? { endpoint } : {}),
    });
    this.client = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.logger.log(
      isLocal
        ? `DynamoDB client (local) → ${endpoint}`
        : 'DynamoDB client (AWS)',
    );
  }

  /** Maps missing-table errors to a clear API response (avoids opaque 500s in local dev). */
  private async send<T>(label: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: unknown) {
      const name =
        e && typeof e === 'object' && 'name' in e ? String((e as { name?: string }).name) : '';
      if (name === 'ResourceNotFoundException') {
        this.logger.error(`DynamoDB ${label}: table or index not found`);
        throw new ServiceUnavailableException(
          'DynamoDB tables are missing or out of date. For local development: start dynalite, then from the backend folder run npm run setup:tables.',
        );
      }
      throw e;
    }
  }

  async put(table: string, item: Record<string, any>): Promise<void> {
    await this.send('put', () => this.client.send(new PutCommand({ TableName: table, Item: item })));
  }

  async get(table: string, key: Record<string, any>): Promise<any | null> {
    const result = await this.send('get', () =>
      this.client.send(new GetCommand({ TableName: table, Key: key })),
    );
    return result.Item || null;
  }

  async update(
    table: string,
    key: Record<string, any>,
    updates: Record<string, any>,
    removeAttrs?: string[],
  ): Promise<any> {
    const setExpressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    for (const [k, v] of Object.entries(updates)) {
      const nameKey = `#${k}`;
      const valueKey = `:${k}`;
      setExpressions.push(`${nameKey} = ${valueKey}`);
      names[nameKey] = k;
      values[valueKey] = v;
    }

    const removeNames = (removeAttrs || []).filter(Boolean);
    for (const k of removeNames) {
      names[`#r_${k}`] = k;
    }
    const removeExpr = removeNames.length ? ` REMOVE ${removeNames.map((k) => `#r_${k}`).join(', ')}` : '';
    const setPart = setExpressions.length ? `SET ${setExpressions.join(', ')}` : '';
    const updateExpression = `${setPart}${removeExpr}`.trim();
    if (!updateExpression) {
      throw new Error('DynamoService.update: empty update and remove');
    }

    const result = await this.send('update', () =>
      this.client.send(
        new UpdateCommand({
          TableName: table,
          Key: key,
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: names,
          ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
          ReturnValues: 'ALL_NEW',
        }),
      ),
    );
    return result.Attributes;
  }

  async delete(table: string, key: Record<string, any>): Promise<void> {
    await this.send('delete', () => this.client.send(new DeleteCommand({ TableName: table, Key: key })));
  }

  async query(params: QueryCommandInput): Promise<any[]> {
    const result = await this.send('query', () => this.client.send(new QueryCommand(params)));
    return result.Items || [];
  }

  /** Paginated query (DynamoDB returns at most 1MB per page). */
  async queryAllPages(params: QueryCommandInput): Promise<any[]> {
    const { ExclusiveStartKey: _start, ...rest } = params;
    void _start;
    const out: any[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    for (;;) {
      const result = await this.send('queryAllPages', () =>
        this.client.send(new QueryCommand({ ...rest, ExclusiveStartKey })),
      );
      out.push(...(result.Items || []));
      ExclusiveStartKey = result.LastEvaluatedKey;
      if (!ExclusiveStartKey) break;
    }
    return out;
  }

  async scan(params: ScanCommandInput): Promise<any[]> {
    const result = await this.send('scan', () => this.client.send(new ScanCommand(params)));
    return result.Items || [];
  }

  /** Paginated scan — use sparingly; prefer GSIs and Query. */
  async scanAllPages(params: ScanCommandInput): Promise<any[]> {
    const { ExclusiveStartKey: _start, ...rest } = params;
    void _start;
    const out: any[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    for (;;) {
      const result = await this.send('scanAllPages', () =>
        this.client.send(new ScanCommand({ ...rest, ExclusiveStartKey })),
      );
      out.push(...(result.Items || []));
      ExclusiveStartKey = result.LastEvaluatedKey;
      if (!ExclusiveStartKey) break;
    }
    return out;
  }

  async queryOne(params: QueryCommandInput): Promise<any | null> {
    const items = await this.query({ ...params, Limit: 1 });
    return items[0] || null;
  }

  tableName(name: string): string {
    return `evision_${name}`;
  }
}
