import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';

const pg = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.afhpypmmyxbkusqewxfu:MWyL676uRJN8u0dt@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
    }
  }
});

const sqlitePath = '/storage/Documents/projects/software/mail_autodb/custom.db';
const sqlite = new DatabaseSync(sqlitePath, { readonly: true });

function convertValue(colName, value) {
  if (value === null || value === undefined) return null;
  
  const boolCols = ['active', 'verified', 'trackOpens', 'trackClicks', 'enabled'];
  if (boolCols.includes(colName)) {
    return value === 1 || value === '1' || value === true;
  }
  
  const dateCols = ['createdAt', 'updatedAt', 'sentAt', 'dueAt'];
  if (dateCols.includes(colName)) {
    if (typeof value === 'number') {
      return new Date(value);
    }
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  }
  
  return value;
}

async function copyTable(tableName) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length === 0) {
    console.log(`${tableName}: 0 rows (skipping)`);
    return;
  }
  
  console.log(`${tableName}: ${rows.length} rows`);
  
  for (const row of rows) {
    try {
      const data = {};
      for (const [col, val] of Object.entries(row)) {
        data[col] = convertValue(col, val);
      }
      
      // Use Prisma model create (handles types)
      const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
      if (pg[modelName] && pg[modelName].create) {
        await pg[modelName].create({ data });
      } else {
        console.error(`  No model for ${tableName}`);
      }
    } catch (e) {
      // Ignore unique constraint errors (ON CONFLICT equivalent)
      if (!e.message.includes('Unique constraint') && !e.message.includes('P2002')) {
        console.error(`  Error inserting into ${tableName}:`, e.message);
      }
    }
  }
}

const order = [
  'SenderAccount',
  'Contact',
  'ContactGroup',
  'Form',
  'Campaign',
  'ContactGroupAssignment',
  'CampaignRecipient',
  'FormSubmission',
  'Workflow',
  'AutomationEnrollment',
  'Setting',
  'StoredFile',
  'TrackingToken',
  'TrackingEvent',
  'TrackingOpen',
];

for (const table of order) {
  await copyTable(table);
}

console.log('\nVerifying counts...');
for (const table of order) {
  const count = await pg.$queryRawUnsafe(`SELECT count(*) FROM "${table}"`);
  console.log(`  ${table}: ${count[0].count}`);
}

await pg.$disconnect();
sqlite.close();
console.log('Done!');
