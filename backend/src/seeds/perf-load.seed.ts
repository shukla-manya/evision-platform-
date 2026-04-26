/**
 * Inserts many catalogue rows + optional order group for local performance testing.
 * Requires DynamoDB (local or AWS) and at least one approved admin shop.
 *
 * Usage: npm run seed:perf
 * Env: PERF_PRODUCT_COUNT (default 48), PERF_ORDER_GROUPS (default 0)
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { ensureEvisionDynamoTables } from './dynamo-tables.setup';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const endpoint =
  process.env.DYNAMODB_ENDPOINT || process.env.DYNAMO_ENDPOINT || undefined;
const isLocal = Boolean(endpoint);
const raw = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || (isLocal ? 'local' : ''),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || (isLocal ? 'local' : ''),
  },
  ...(endpoint ? { endpoint } : {}),
});

const CAT_A = '11111111-1111-4111-8111-111111111101';
const CAT_B = '11111111-1111-4111-8111-111111111102';

async function main() {
  console.log('\n⚡ E Vision — perf catalogue seed\n');
  await ensureEvisionDynamoTables(raw);
  const client = DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
  });

  const adminRes = await client.send(
    new QueryCommand({
      TableName: 'evision_admins',
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#s = :st',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':st': 'approved' },
      Limit: 1,
    }),
  );
  const admin = (adminRes.Items || [])[0] as { id?: string } | undefined;
  if (!admin?.id) {
    console.error('✗ No approved admin found. Approve a shop first, then re-run.\n');
    process.exit(1);
  }
  const adminId = String(admin.id);
  const now = new Date().toISOString();

  await client.send(
    new PutCommand({
      TableName: 'evision_categories',
      Item: {
        id: CAT_A,
        name: 'Perf Category A',
        parent_id: null,
        created_at: now,
      },
    }),
  );
  await client.send(
    new PutCommand({
      TableName: 'evision_categories',
      Item: {
        id: CAT_B,
        name: 'Perf Category B',
        parent_id: null,
        created_at: now,
      },
    }),
  );

  const n = Math.min(500, Math.max(1, Number(process.env.PERF_PRODUCT_COUNT || 48) || 48));
  const half = Math.ceil(n / 2);
  for (let i = 0; i < n; i += 1) {
    const id = uuidv4();
    const cat = i < half ? CAT_A : CAT_B;
    await client.send(
      new PutCommand({
        TableName: 'evision_products',
        Item: {
          id,
          admin_id: adminId,
          name: `Perf load product ${i + 1}`,
          description: 'Synthetic row for load testing.',
          price_customer: 1000 + (i % 50) * 100,
          price_dealer: 900 + (i % 50) * 90,
          stock: 50,
          category_id: cat,
          brand: i % 3 === 0 ? 'PerfBrand' : 'Demo',
          active: true,
          images: [],
          low_stock_threshold: 5,
          min_order_quantity: 1,
          mrp: 1200 + i * 10,
          created_at: now,
          updated_at: now,
        },
      }),
    );
  }
  console.log(`  ✓ Upserted 2 categories and ${n} products (admin ${adminId})\n`);

  const groups = Math.min(20, Math.max(0, Number(process.env.PERF_ORDER_GROUPS || 0) || 0));
  if (groups > 0) {
    const userRes = await client.send(
      new QueryCommand({
        TableName: 'evision_users',
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :e',
        ExpressionAttributeValues: { ':e': 'perf-customer@evision.local' },
        Limit: 1,
      }),
    );
    let userId = (userRes.Items?.[0] as { id?: string } | undefined)?.id;
    if (!userId) {
      userId = uuidv4();
      await client.send(
        new PutCommand({
          TableName: 'evision_users',
          Item: {
            id: userId,
            email: 'perf-customer@evision.local',
            phone: '+919000000001',
            name: 'Perf Customer',
            role: 'customer',
            created_at: now,
          },
        }),
      );
    }
    for (let g = 0; g < groups; g += 1) {
      const groupId = uuidv4();
      const orderId = uuidv4();
      await client.send(
        new PutCommand({
          TableName: 'evision_order_groups',
          Item: {
            id: groupId,
            user_id: userId,
            total_amount: 2500,
            currency: 'INR',
            status: 'payment_confirmed',
            created_at: now,
            updated_at: now,
          },
        }),
      );
      await client.send(
        new PutCommand({
          TableName: 'evision_orders',
          Item: {
            id: orderId,
            group_id: groupId,
            user_id: userId,
            admin_id: adminId,
            total_amount: 2500,
            currency: 'INR',
            status: 'order_received',
            created_at: now,
            updated_at: now,
          },
        }),
      );
      await client.send(
        new PutCommand({
          TableName: 'evision_order_items',
          Item: {
            order_id: orderId,
            id: uuidv4(),
            product_id: uuidv4(),
            product_name: `Perf order line ${g}`,
            quantity: 1,
            unit_price: 2500,
            line_total: 2500,
            admin_id: adminId,
            created_at: now,
          },
        }),
      );
    }
    console.log(`  ✓ Added ${groups} order group(s) for perf-customer@evision.local\n`);
  }

  console.log('✅ Perf seed complete. Hit GET /products (catalog) and admin orders to compare timings.\n');
}

main().catch((err) => {
  console.error('Seed failed:', err?.message || err);
  process.exit(1);
});
