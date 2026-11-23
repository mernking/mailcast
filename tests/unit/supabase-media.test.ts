import { test } from "node:test";
import assert from "node:assert/strict";
import { replaceDataUris } from "../../src/lib/supabase-storage.ts";

const fakeUpload = async (dataUri: string) => ({
  url: `https://example.supabase.co/storage/v1/object/public/email-media/images/${dataUri.length}.png`,
});

test("replaces a data: image with a public URL", async () => {
  const html = `<img src="data:image/png;base64,abc123" alt="logo">`;
  const out = await replaceDataUris(html, fakeUpload);
  assert.ok(!out.includes("data:image"));
  assert.ok(out.includes("https://example.supabase.co/storage/v1/object/public/email-media/"));
  assert.ok(out.includes('alt="logo"'));
});

test("leaves external URLs and tracking pixels untouched", async () => {
  const html = [
    `<img src="https://cdn.example.com/a.jpg">`,
    `<img src="/api/t/token123">`,
    `<img src="cid:img-1-abc">`,
  ].join("\n");
  const out = await replaceDataUris(html, fakeUpload);
  assert.equal(out, html);
});

test("uploads identical data URIs only once", async () => {
  let calls = 0;
  const html = [
    `<img src="data:image/png;base64,SAME">`,
    `<img src="data:image/png;base64,SAME">`,
  ].join("\n");
  const out = await replaceDataUris(html, async (uri) => {
    calls++;
    return { url: `https://cdn/obj/${calls}.png` };
  });
  assert.equal(calls, 1);
  assert.ok(out.includes("https://cdn/obj/1.png"));
  assert.equal(out.match(/https:\/\/cdn\/obj/g)?.length, 2);
});

test("handles single-quoted src attributes", async () => {
  const html = `<img src='data:image/jpeg;base64,xyz'>`;
  const out = await replaceDataUris(html, fakeUpload);
  assert.ok(!out.includes("data:image"));
  assert.ok(out.includes("src='https://"));
});

test("supports webp and gif data URIs", async () => {
  const html = [
    `<img src="data:image/webp;base64,aaa">`,
    `<img src="data:image/gif;base64,bbb">`,
  ].join("\n");
  const out = await replaceDataUris(html, fakeUpload);
  assert.ok(!out.includes("data:image"));
});

console.log("All Supabase media tests passed!");
