import pg from 'pg';
const { Client } = pg;

const poolerUrl = 'postgresql://postgres.afhpypmmyxbkusqewxfu:MWyL676uRJN8u0dt@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function applyMigration(url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log('Connected, applying migration...');
  
  const fs = await import('fs');
  const sql = fs.readFileSync('/storage/Documents/projects/software/mail_auto/scripts/migration.sql', 'utf8');
  
  // Split by semicolon and execute each statement
  const statements = sql.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      try {
        await client.query(stmt);
        console.log('  OK:', stmt.trim().slice(0, 60) + '...');
      } catch (e) {
        if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
          console.log('  ERROR:', e.message);
          console.log('  Statement:', stmt.trim().slice(0, 100));
        }
      }
    }
  }
  
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' ORDER BY table_name
  `);
  console.log('Tables created:', tables.rows.map(r => r.table_name).join(', '));
  
  await client.end();
}

await applyMigration(poolerUrl);
