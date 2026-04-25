import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
  UpdateTimeToLiveCommand,
} from '@aws-sdk/client-dynamodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const endpoint =
  process.env.DYNAMODB_ENDPOINT || process.env.DYNAMO_ENDPOINT || undefined;
const isLocal = Boolean(endpoint);
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || (isLocal ? 'local' : ''),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || (isLocal ? 'local' : ''),
  },
  ...(endpoint ? { endpoint } : {}),
});

const TABLES = [
  {
    TableName: 'evision_users',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'phone', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PhoneIndex',
        KeySchema: [{ AttributeName: 'phone', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_admins',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'StatusIndex',
        KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_otps',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'phone', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'phone', AttributeType: 'S' }],
    ttlAttribute: 'expires_at',
  },
  {
    TableName: 'evision_superadmin',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
  },
  {
    TableName: 'evision_products',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'admin_id', AttributeType: 'S' },
      { AttributeName: 'category_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'AdminIndex',
        KeySchema: [{ AttributeName: 'admin_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'CategoryIndex',
        KeySchema: [{ AttributeName: 'category_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_categories',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
  },
  {
    TableName: 'evision_cart_items',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' },
    ],
  },
  {
    TableName: 'evision_order_groups',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIndex',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_orders',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'group_id', AttributeType: 'S' },
      { AttributeName: 'admin_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GroupIndex',
        KeySchema: [{ AttributeName: 'group_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'AdminIndex',
        KeySchema: [{ AttributeName: 'admin_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_order_items',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'order_id', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'order_id', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' },
    ],
  },
  {
    TableName: 'evision_invoices',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'order_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'OrderIndex',
        KeySchema: [{ AttributeName: 'order_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_email_logs',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'trigger_event', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EventIndex',
        KeySchema: [{ AttributeName: 'trigger_event', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  // ── Electrician & services ──────────────────────────────────────────────────
  {
    TableName: 'evision_electricians',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id',      AttributeType: 'S' },
      { AttributeName: 'phone',   AttributeType: 'S' },
      { AttributeName: 'email',   AttributeType: 'S' },
      { AttributeName: 'status',  AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PhoneIndex',
        KeySchema: [{ AttributeName: 'phone', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'StatusIndex',
        KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'UserIndex',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_service_requests',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id',      AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'status',  AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIndex',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'StatusIndex',
        KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_service_bookings',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id',                 AttributeType: 'S' },
      { AttributeName: 'service_request_id', AttributeType: 'S' },
      { AttributeName: 'electrician_id',     AttributeType: 'S' },
      { AttributeName: 'user_id',            AttributeType: 'S' },
      { AttributeName: 'status',             AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'RequestIndex',
        KeySchema: [{ AttributeName: 'service_request_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'ElectricianIndex',
        KeySchema: [{ AttributeName: 'electrician_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'UserIndex',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'StatusIndex',
        KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'evision_reviews',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id',             AttributeType: 'S' },
      { AttributeName: 'electrician_id', AttributeType: 'S' },
      { AttributeName: 'user_id',        AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ElectricianIndex',
        KeySchema: [{ AttributeName: 'electrician_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'UserIndex',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
];

async function setup() {
  console.log('\n⚡ E Vision — DynamoDB Table Setup\n');
  console.log(`Region: ${process.env.AWS_REGION || 'ap-south-1'}\n`);

  let existingTables: string[] = [];
  try {
    const result = await client.send(new ListTablesCommand({}));
    existingTables = result.TableNames || [];
    console.log(`Found ${existingTables.length} existing table(s)\n`);
  } catch (err) {
    console.error('✗ Cannot connect to DynamoDB. Check AWS credentials in .env\n', err.message);
    process.exit(1);
  }

  for (const { ttlAttribute, ...tableConfig } of TABLES as any[]) {
    if (existingTables.includes(tableConfig.TableName)) {
      console.log(`  ✓ ${tableConfig.TableName} (exists)`);
      continue;
    }
    try {
      await client.send(new CreateTableCommand(tableConfig));
      console.log(`  ✓ Created ${tableConfig.TableName}`);

      if (ttlAttribute) {
        // Wait briefly before setting TTL
        await new Promise(r => setTimeout(r, 1000));
        await client.send(
          new UpdateTimeToLiveCommand({
            TableName: tableConfig.TableName,
            TimeToLiveSpecification: { AttributeName: ttlAttribute, Enabled: true },
          }),
        );
        console.log(`    → TTL enabled on '${ttlAttribute}'`);
      }
    } catch (err) {
      console.error(`  ✗ Failed to create ${tableConfig.TableName}:`, err.message);
    }
  }

  console.log('\n✅ DynamoDB setup complete!\n');
}

setup();
