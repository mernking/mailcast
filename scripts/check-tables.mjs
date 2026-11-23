import pg from 'pg';
const { Client } = pg;

const poolerUrl = 'postgresql://postgres.afhpypmmyxbkusqewxfu:MWyL676uRJN8u0dt@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function check() {
  const client = new Client({ connectionString: poolerUrl });
  await client.connect();
  
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' ORDER BY table_name
  `);
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
  
  // Check if _prisma_migrations exists
  const migrations = await client.query(`
    SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5
  `);
  console.log('Migrations:', migrations.rows);
  
  await client.end();
}

await check();
