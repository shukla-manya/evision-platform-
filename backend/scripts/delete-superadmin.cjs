/**
 * Remove the platform superadmin row from MongoDB (evision_superadmin, id SUPERADMIN).
 * After this, POST /auth/superadmin/login fails until you run: npm run seed:superadmin
 *
 * Usage:
 *   node scripts/delete-superadmin.cjs --yes
 *   npm run delete:superadmin -- --yes
 */
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function mongoUri() {
  const m = process.env.MONGODB_URI?.trim();
  const d = process.env.DATABASE_URL?.trim();
  for (const u of [m, d]) {
    if (u && (u.startsWith('mongodb://') || u.startsWith('mongodb+srv://'))) return u;
  }
  return 'mongodb://127.0.0.1:27017/evision';
}

async function main() {
  if (process.argv.includes('-h') || process.argv.includes('--help')) {
    console.error('Removes evision_superadmin document id SUPERADMIN.\nPass --yes to confirm.\n');
    process.exit(0);
  }
  if (!process.argv.includes('--yes')) {
    console.error(
      [
        'Refusing to delete: pass --yes to confirm.',
        '  cd backend && npm run delete:superadmin -- --yes',
        '',
        'Restore later: npm run seed:superadmin (needs SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD in .env)',
      ].join('\n'),
    );
    process.exit(1);
  }

  const client = new MongoClient(mongoUri());
  await client.connect();
  const col = client.db().collection('evision_superadmin');
  const before = await col.findOne({ id: 'SUPERADMIN' });
  if (!before) {
    console.log('No superadmin row (id SUPERADMIN). Nothing to delete.');
    await client.close();
    return;
  }
  const r = await col.deleteOne({ id: 'SUPERADMIN' });
  console.log(
    JSON.stringify(
      {
        deletedCount: r.deletedCount,
        previousEmail: before.email,
        hint: 'Run npm run seed:superadmin to create superadmin again.',
      },
      null,
      2,
    ),
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
