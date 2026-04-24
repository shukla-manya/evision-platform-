import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const raw = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const client = DynamoDBDocumentClient.from(raw);

async function seedSuperadmin() {
  console.log('\n⚡ E Vision — Superadmin Seed\n');

  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('✗ SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  // Check if already exists
  const existing = await client.send(
    new GetCommand({ TableName: 'evision_superadmin', Key: { id: 'SUPERADMIN' } }),
  );

  if (existing.Item) {
    console.log('  ⚠ Superadmin already exists. Skipping.\n');
    console.log(`  Email: ${existing.Item.email}`);
    console.log('  To update, delete the record and re-run this script.\n');
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);

  await client.send(
    new PutCommand({
      TableName: 'evision_superadmin',
      Item: {
        id: 'SUPERADMIN',
        name,
        email,
        password_hash,
        role: 'superadmin',
        created_at: new Date().toISOString(),
      },
    }),
  );

  console.log('  ✅ Superadmin seeded successfully!\n');
  console.log(`  Name:  ${name}`);
  console.log(`  Email: ${email}`);
  console.log('  Password: (hidden — from .env SUPERADMIN_PASSWORD)\n');
  console.log('  Login at: /auth/superadmin/login\n');
}

seedSuperadmin().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
