import './load-env.mjs';
import {
  uploadImageBytes,
  hostInlineImages,
  listImages,
  deleteImage,
} from '../src/lib/supabase-storage.ts';

// 1x1 transparent PNG
const png = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
));

const stored = await uploadImageBytes(png, 'image/png');
console.log('Uploaded:', stored.path);
console.log('Public URL:', stored.url);

const res = await fetch(stored.url);
console.log('Public fetch status:', res.status, res.headers.get('content-type'));
if (!res.ok) throw new Error('Public URL is not accessible');

const html = `<img src="data:image/png;base64,${Buffer.from(png).toString('base64')}">`;
const hosted = await hostInlineImages(html);
console.log('Hosted HTML:', hosted.slice(0, 160));
if (hosted.includes('data:image')) throw new Error('data URI was not replaced');
if (!hosted.includes(stored.url)) throw new Error('public URL missing from HTML');

const images = await listImages();
console.log('Listed images:', images.length);
if (!images.some(i => i.path === stored.path)) throw new Error('uploaded image missing from list');

await deleteImage(stored.path);
console.log('Deleted test image');
console.log('MEDIA SYSTEM VERIFIED');
