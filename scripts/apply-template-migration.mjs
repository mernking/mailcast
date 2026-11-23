import pg from 'pg';
const { Client } = pg;

const poolerUrl = 'postgresql://postgres.afhpypmmyxbkusqewxfu:MWyL676uRJN8u0dt@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function apply() {
  const client = new Client({ connectionString: poolerUrl });
  await client.connect();

  // Create EmailTemplate table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "EmailTemplate" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "project" TEXT NOT NULL,
      "mjml" TEXT,
      "html" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('Created EmailTemplate table');

  // Update _prisma_migrations
  const crypto = await import('crypto');
  const migrationName = '20261123000001_add_email_template';
  const checksum = crypto.createHash('md5').update(migrationName).digest('hex');

  await client.query(`
    INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
    VALUES ($1, $2, $3, NOW(), NOW(), 1)
    ON CONFLICT (id) DO NOTHING
  `, [migrationName, checksum, migrationName]);
  console.log('Inserted migration record');

  // Verify
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' ORDER BY table_name
  `);
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

  const migrations = await client.query(`SELECT * FROM _prisma_migrations`);
  console.log('Migrations:', migrations.rows);

  await client.end();
}

await apply();
