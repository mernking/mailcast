import pg from 'pg';
const { Client } = pg;

const poolerUrl = 'postgresql://postgres.afhpypmmyxbkusqewxfu:MWyL676uRJN8u0dt@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function verify() {
  const client = new Client({ connectionString: poolerUrl });
  await client.connect();

  const tables = [
    'SenderAccount', 'Contact', 'ContactGroup', 'Form', 'Campaign',
    'ContactGroupAssignment', 'CampaignRecipient', 'FormSubmission',
    'Workflow', 'AutomationEnrollment', 'Setting', 'StoredFile',
    'TrackingToken', 'TrackingEvent', 'TrackingOpen', 'EmailTemplate'
  ];

  console.log('Postgres row counts:');
  for (const table of tables) {
    const count = await client.query(`SELECT count(*) FROM "${table}"`);
    console.log(`  ${table}: ${count.rows[0].count}`);
  }

  await client.end();
}

await verify();
