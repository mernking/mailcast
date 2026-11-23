/**
 * Seed an administrator account for dashboard login.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-pass' node scripts/seed-admin.mjs
 *   # or
 *   node scripts/seed-admin.mjs --email you@example.com --password 'strong-pass'
 *
 * If no password is supplied, a strong random one is generated and printed ONCE.
 */
import './load-env.mjs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const arg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const email = (arg('--email') || process.env.ADMIN_EMAIL || 'admin@mailcast.local').trim().toLowerCase();
let password = arg('--password') || process.env.ADMIN_PASSWORD;

if (!password) {
  password = crypto.randomBytes(18).toString('base64url');
  console.log('\n=== GENERATED ADMIN PASSWORD (shown once — save it now) ===');
  console.log(password);
  console.log('==========================================================\n');
}

if (password.length < 10) {
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}

const db = new PrismaClient();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.adminUser.upsert({
    where: { email },
    create: { email, name: 'Administrator', passwordHash },
    update: { passwordHash },
    select: { id: true, email: true },
  });
  console.log('Admin seeded:', user.email);
} finally {
  await db.$disconnect();
}
