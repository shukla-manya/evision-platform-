/**
 * Delete a customer row from evision_users (and cart) by email.
 * Usage: node scripts/delete-user-by-email.cjs you@example.com
 *
 * Use a file instead of node -e "..." so zsh does not treat ! as history expansion.
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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const raw = process.argv[2];
  if (!raw || raw === '-h' || raw === '--help') {
    console.error('Usage: node scripts/delete-user-by-email.cjs <email>');
    process.exit(raw ? 0 : 1);
  }
  const emailNorm = raw.trim().toLowerCase();
  const rx = new RegExp(`^${escapeRegex(emailNorm)}$`, 'i');

  const client = new MongoClient(mongoUri());
  await client.connect();
  const db = client.db();

  const u = await db.collection('evision_users').findOne({ email: rx });
  if (!u) {
    console.log('No user with that email');
    await client.close();
    return;
  }

  const uid = u.id;
  const cart = await db.collection('evision_cart_items').deleteMany({ user_id: uid });
  const r = await db.collection('evision_users').deleteOne({ id: uid });

  console.log(
    JSON.stringify(
      {
        deletedUsers: r.deletedCount,
        deletedCartItems: cart.deletedCount,
        id: uid,
        email: u.email,
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
