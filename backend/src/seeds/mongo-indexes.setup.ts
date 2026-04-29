/**
 * Recommended MongoDB indexes (idempotent). Collections are created implicitly on first write.
 *
 * Run: npm run setup:tables
 * Env: MONGODB_URI or DATABASE_URL (defaults to mongodb://127.0.0.1:27017/evision)
 */
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

const INDEX_SPECS: { collection: string; keys: Record<string, 1 | -1>; options?: { unique?: boolean } }[] = [
  { collection: 'evision_users', keys: { phone: 1 } },
  { collection: 'evision_users', keys: { email: 1 } },
  { collection: 'evision_admins', keys: { email: 1 } },
  { collection: 'evision_admins', keys: { status: 1 } },
  { collection: 'evision_products', keys: { admin_id: 1 } },
  { collection: 'evision_products', keys: { category_id: 1 } },
  { collection: 'evision_order_groups', keys: { user_id: 1 } },
  { collection: 'evision_order_groups', keys: { razorpay_order_id: 1 } },
  { collection: 'evision_orders', keys: { group_id: 1 } },
  { collection: 'evision_orders', keys: { admin_id: 1 } },
  { collection: 'evision_orders', keys: { user_id: 1 } },
  { collection: 'evision_orders', keys: { status: 1, id: 1 } },
  { collection: 'evision_orders', keys: { awb_number: 1 } },
  { collection: 'evision_invoices', keys: { order_id: 1 } },
  { collection: 'evision_email_logs', keys: { trigger_event: 1 } },
  { collection: 'evision_electricians', keys: { phone: 1 } },
  { collection: 'evision_electricians', keys: { email: 1 } },
  { collection: 'evision_electricians', keys: { status: 1 } },
  { collection: 'evision_electricians', keys: { user_id: 1 } },
  { collection: 'evision_electricians', keys: { discovery_key: 1, id: 1 } },
  { collection: 'evision_service_requests', keys: { user_id: 1 } },
  { collection: 'evision_service_requests', keys: { status: 1 } },
  { collection: 'evision_service_bookings', keys: { service_request_id: 1 } },
  { collection: 'evision_service_bookings', keys: { electrician_id: 1 } },
  { collection: 'evision_service_bookings', keys: { user_id: 1 } },
  { collection: 'evision_service_bookings', keys: { status: 1 } },
  { collection: 'evision_reviews', keys: { electrician_id: 1 } },
  { collection: 'evision_reviews', keys: { user_id: 1 } },
  { collection: 'evision_cart_items', keys: { user_id: 1, id: 1 }, options: { unique: true } },
  { collection: 'evision_order_items', keys: { order_id: 1, id: 1 }, options: { unique: true } },
];

export async function ensureEvisionMongoIndexes(client: MongoClient): Promise<void> {
  const db = client.db();
  for (const { collection, keys, options } of INDEX_SPECS) {
    await db
      .collection(collection)
      .createIndex(keys, options?.unique ? { unique: true } : {});
  }
}

async function setupCli(): Promise<void> {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  const uri =
    process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/evision';

  console.log('\n⚡ E vision — MongoDB indexes\n');
  console.log(`URI: ${uri.replace(/\/\/([^@]+@)?/, '//***@')}\n`);

  const client = new MongoClient(uri);
  try {
    await client.connect();
    await ensureEvisionMongoIndexes(client);
    console.log('  ✓ Indexes ensured for evision_* collections\n');
    console.log('✅ MongoDB setup complete!\n');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('✗ MongoDB setup failed:', msg);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  void setupCli();
}
