/**
 * Inserts many catalogue rows + optional order group for local performance testing.
 * Requires MongoDB and at least one approved admin shop.
 *
 * Usage: npm run seed:perf
 * Env: MONGODB_URI / DATABASE_URL, PERF_PRODUCT_COUNT (default 48), PERF_ORDER_GROUPS (default 0)
 */
import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CAT_A = '11111111-1111-4111-8111-111111111101';
const CAT_B = '11111111-1111-4111-8111-111111111102';

async function main() {
  console.log('\n⚡ E vision — perf catalogue seed\n');

  const uri =
    process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/evision';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const admin = await db.collection('evision_admins').findOne({ status: 'approved' });
  if (!admin?.id) {
    console.error('✗ No approved admin found. Approve a shop first, then re-run.\n');
    process.exit(1);
  }
  const adminId = String(admin.id);
  const now = new Date().toISOString();

  await db.collection('evision_categories').replaceOne(
    { id: CAT_A },
    { id: CAT_A, name: 'Perf Category A', parent_id: null, created_at: now },
    { upsert: true },
  );
  await db.collection('evision_categories').replaceOne(
    { id: CAT_B },
    { id: CAT_B, name: 'Perf Category B', parent_id: null, created_at: now },
    { upsert: true },
  );

  const n = Math.min(500, Math.max(1, Number(process.env.PERF_PRODUCT_COUNT || 48) || 48));
  const half = Math.ceil(n / 2);
  for (let i = 0; i < n; i += 1) {
    const id = uuidv4();
    const cat = i < half ? CAT_A : CAT_B;
    await db.collection('evision_products').insertOne({
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
    });
  }
  console.log(`  ✓ Inserted 2 categories and ${n} products (admin ${adminId})\n`);

  const groups = Math.min(20, Math.max(0, Number(process.env.PERF_ORDER_GROUPS || 0) || 0));
  if (groups > 0) {
    let userId = (await db.collection('evision_users').findOne({ email: 'perf-customer@evision.local' }))?.id as
      | string
      | undefined;
    if (!userId) {
      userId = uuidv4();
      await db.collection('evision_users').insertOne({
        id: userId,
        email: 'perf-customer@evision.local',
        phone: '+919000000001',
        name: 'Perf Customer',
        role: 'customer',
        created_at: now,
      });
    }
    for (let g = 0; g < groups; g += 1) {
      const groupId = uuidv4();
      const orderId = uuidv4();
      await db.collection('evision_order_groups').insertOne({
        id: groupId,
        user_id: userId,
        total_amount: 2500,
        currency: 'INR',
        status: 'payment_confirmed',
        created_at: now,
        updated_at: now,
      });
      await db.collection('evision_orders').insertOne({
        id: orderId,
        group_id: groupId,
        user_id: userId,
        admin_id: adminId,
        total_amount: 2500,
        currency: 'INR',
        status: 'order_received',
        created_at: now,
        updated_at: now,
      });
      await db.collection('evision_order_items').insertOne({
        order_id: orderId,
        id: uuidv4(),
        product_id: uuidv4(),
        product_name: `Perf order line ${g}`,
        quantity: 1,
        unit_price: 2500,
        line_total: 2500,
        admin_id: adminId,
        created_at: now,
      });
    }
    console.log(`  ✓ Added ${groups} order group(s) for perf-customer@evision.local\n`);
  }

  await client.close();
  console.log('✅ Perf seed complete. Hit GET /products (catalog) and admin orders to compare timings.\n');
}

main().catch((err) => {
  console.error('Seed failed:', err?.message || err);
  process.exit(1);
});
