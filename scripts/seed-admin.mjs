/**
 * Seed an administrator account for dashboard login.
 *
 * Usage:
 *   pnpm seed
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-pass' pnpm seed
 *   pnpm seed -- --email you@example.com --password 'strong-pass'
 *
 * Defaults (local development only):
 *   email:    admin@mailcast.local
 *   password: jhon3:16FGLW
 *
 * In production there is no known default password: if ADMIN_PASSWORD is not
 * supplied, a strong random one is generated and printed once.
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

const isProduction = process.env.NODE_ENV === 'production';
const DEV_PASSWORD = 'jhon3:16FGLW';

const email = (
  arg('--email') ||
  process.env.ADMIN_EMAIL ||
  'admin@mailcast.local'
).trim().toLowerCase();

let password = arg('--password') || process.env.ADMIN_PASSWORD;

if (!password && !isProduction) {
  // Convenient known password for local testing.
  password = DEV_PASSWORD;
}

if (!password) {
  // Production: never ship a password committed in source control.
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
  if (!isProduction) {
    console.log('Login password:', password);
  }
} finally {
  await db.$disconnect();
}
