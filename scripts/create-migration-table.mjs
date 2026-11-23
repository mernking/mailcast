import pg from 'pg';
const { Client } = pg;

const poolerUrl = 'postgresql://postgres.afhpypmmyxbkusqewxfu:MWyL676uRJN8u0dt@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function createMigrationTable() {
  const client = new Client({ connectionString: poolerUrl });
  await client.connect();
  
  // Create _prisma_migrations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('Created _prisma_migrations table');
  
  // Insert the migration record
  const crypto = await import('crypto');
  const migrationName = '20261122000000_init';
  const checksum = crypto.createHash('md5').update(migrationName).digest('hex');
  
  await client.query(`
    INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
    VALUES ($1, $2, $3, NOW(), NOW(), 1)
    ON CONFLICT (id) DO NOTHING
  `, [migrationName, checksum, migrationName]);
  console.log('Inserted migration record');
  
  const migrations = await client.query(`SELECT * FROM _prisma_migrations`);
  console.log('Migrations:', migrations.rows);
  
  await client.end();
}

await createMigrationTable();
