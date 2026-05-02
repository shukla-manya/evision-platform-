/**
 * Delete a customer row from evision_users (and cart) by email.
 *
 * Usage:
 *   node scripts/delete-user-by-email.cjs <actual-email@domain.com>
 *   node scripts/delete-user-by-email.cjs --list-customers
 *   npm run delete:user -- your@email.com
 *   npm run delete:user -- --list-customers
 *
 * Replace the email with the real address stored on the user — not the placeholder
 * "real.email@example.com" from docs.
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
    console.error(
      [
        'Usage:',
        '  node scripts/delete-user-by-email.cjs <email>     delete that user (+ cart)',
        '  node scripts/delete-user-by-email.cjs --list-customers   print customer emails in DB',
      ].join('\n'),
    );
    process.exit(raw ? 0 : 1);
  }

  const client = new MongoClient(mongoUri());
  await client.connect();
  const db = client.db();

  if (raw === '--list-customers' || raw === '--list') {
    const rows = await db
      .collection('evision_users')
      .find({ role: 'customer' })
      .project({ id: 1, email: 1, phone: 1, created_at: 1 })
      .sort({ email: 1 })
      .toArray();
    if (rows.length === 0) {
      console.log('No users with role "customer".');
    } else {
      console.log(JSON.stringify(rows, null, 2));
      console.error(`\n(${rows.length} customer row(s)) — delete with: npm run delete:user -- <email>`);
    }
    await client.close();
    return;
  }

  const emailNorm = raw.trim().toLowerCase();
  const rx = new RegExp(`^${escapeRegex(emailNorm)}$`, 'i');

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
