import pg from 'pg';
const { Client } = pg;

const poolerUrl = 'postgresql://postgres.afhpypmmyxbkusqewxfu:MWyL676uRJN8u0dt@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function apply() {
  const client = new Client({ connectionString: poolerUrl });
  await client.connect();
  
  await client.query(`ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "fontFamily" TEXT NOT NULL DEFAULT 'helvetica';`);
  console.log('Added fontFamily column');
  
  // Verify
  const res = await client.query(`SELECT column_name, column_default FROM information_schema.columns WHERE table_name='Campaign' AND column_name='fontFamily'`);
  console.log('Column info:', res.rows);
  
  await client.end();
}

await apply();
