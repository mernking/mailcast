import './load-env.mjs';
import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const statements = [
  `CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdminUser_email_key" UNIQUE ("email")
  )`,
  `CREATE TABLE IF NOT EXISTS "AdminSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdminSession_tokenHash_key" UNIQUE ("tokenHash"),
    CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AdminSession_userId_idx" ON "AdminSession"("userId")`,
  `CREATE INDEX IF NOT EXISTS "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt")`,
  `ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3)`,
  `ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "slug" TEXT`,
  `ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "blogExcerpt" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_slug_key" ON "Campaign"("slug")`,
];

for (const sql of statements) {
  try {
    await client.query(sql);
    console.log('OK:', sql.slice(0, 70).replace(/\s+/g, ' ') + '…');
  } catch (e) {
    console.error('ERROR:', e.message);
    throw e;
  }
}

const crypto = await import('crypto');
const name = '20261123000002_auth_blog';
await client.query(
  `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
   VALUES ($1,$2,$3,NOW(),NOW(),1) ON CONFLICT (id) DO NOTHING`,
  [name, crypto.createHash('md5').update(name).digest('hex'), name]
);
console.log('Migration recorded');
await client.end();
