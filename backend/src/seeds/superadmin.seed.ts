import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import * as path from 'path';
import { resolveMongoConnectionStringFromProcessEnv } from '../common/dynamo/mongo-uri.util';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedSuperadmin() {
  console.log('\n⚡ E vision — Superadmin Seed\n');

  const uri = resolveMongoConnectionStringFromProcessEnv();
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';
  const phone = process.env.SUPERADMIN_PHONE || null;

  if (!email || !password) {
    console.error('✗ SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('evision_superadmin');

  try {
    const existing = await col.findOne({ id: 'SUPERADMIN' });
    if (existing) {
      console.log('  ⚠ Superadmin already exists. Skipping.\n');
      console.log(`  Email: ${existing.email}`);
      console.log('  To update, delete the record and re-run this script.\n');
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    await col.insertOne({
      id: 'SUPERADMIN',
      name,
      email,
      phone,
      password_hash,
      role: 'superadmin',
      created_at: new Date().toISOString(),
    });

    console.log('  ✅ Superadmin seeded successfully!\n');
    console.log(`  Name:  ${name}`);
    console.log(`  Email: ${email}`);
    console.log('  Password: (hidden — from .env SUPERADMIN_PASSWORD)\n');
    console.log('  API login: POST /auth/superadmin/login  ·  Web UI (private): /super/signin\n');
  } finally {
    await client.close();
  }
}

seedSuperadmin().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
