import './load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY missing in .env');

const supabase = createClient(url, key);
const { data, error } = await supabase.storage.createBucket('email-media', {
  public: true,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  fileSizeLimit: '5MB',
});
if (error && !/already exists/i.test(error.message)) {
  console.error('Bucket error:', error.message);
  process.exit(1);
}
console.log('Bucket ready:', data?.name || 'email-media (existing)');

const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) throw new Error(listError.message);
console.log('Buckets:', buckets.map(b => `${b.name}${b.public ? ' (public)' : ''}`).join(', '));
