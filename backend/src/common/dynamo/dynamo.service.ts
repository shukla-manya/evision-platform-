import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
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
    const endpoint = this.config.get('DYNAMO_ENDPOINT');
    const raw = new DynamoDBClient({
      region: this.config.get('AWS_REGION', 'ap-south-1'),
      credentials: {
        accessKeyId: this.config.get('AWS_ACCESS_KEY_ID', 'local'),
        secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY', 'local'),
      },
      ...(endpoint ? { endpoint } : {}),
    });
    this.client = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.logger.log(`DynamoDB client initialised${endpoint ? ` → ${endpoint}` : ''}`);
  }

  async put(table: string, item: Record<string, any>): Promise<void> {
    await this.client.send(new PutCommand({ TableName: table, Item: item }));
  }

  async get(table: string, key: Record<string, any>): Promise<any | null> {
    const result = await this.client.send(new GetCommand({ TableName: table, Key: key }));
    return result.Item || null;
  }

  async update(
    table: string,
    key: Record<string, any>,
    updates: Record<string, any>,
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

    const result = await this.client.send(
      new UpdateCommand({
        TableName: table,
        Key: key,
        UpdateExpression: `SET ${setExpressions.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes;
  }

  async delete(table: string, key: Record<string, any>): Promise<void> {
    await this.client.send(new DeleteCommand({ TableName: table, Key: key }));
  }

  async query(params: QueryCommandInput): Promise<any[]> {
    const result = await this.client.send(new QueryCommand(params));
    return result.Items || [];
  }

  async scan(params: ScanCommandInput): Promise<any[]> {
    const result = await this.client.send(new ScanCommand(params));
    return result.Items || [];
  }

  async queryOne(params: QueryCommandInput): Promise<any | null> {
    const items = await this.query({ ...params, Limit: 1 });
    return items[0] || null;
  }

  tableName(name: string): string {
    return `evision_${name}`;
  }
}
