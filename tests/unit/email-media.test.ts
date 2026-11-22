import { test } from "node:test";
import assert from "node:assert/strict";
import { hostInlineImages } from "../../src/lib/email-media.ts";

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

test("data URI images are hosted and replaced", async () => {
  let receivedMime = "";
  let receivedBytes: Buffer | undefined;
  const result = await hostInlineImages(
    `<p>Look <img src="data:image/png;base64,${tinyPng}" alt="dot"></p>`,
    {
      host: async (bytes, mimeType) => {
        receivedBytes = bytes;
        receivedMime = mimeType;
        return "https://cdn.example/api/files/123";
      },
    }
  );
  assert.equal(receivedMime, "image/png");
  assert.equal(receivedBytes?.length, Buffer.from(tinyPng, "base64").length);
  assert.match(result, /src="https:\/\/cdn\.example\/api\/files\/123"/);
  assert.doesNotMatch(result, /data:image/);
});

test("blob sources are removed", async () => {
  const result = await hostInlineImages(
    `<img src="blob:http://localhost/abc" alt="broken">`,
    { host: async () => "https://cdn.example/api/files/1" }
  );
  assert.doesNotMatch(result, /blob:/);
  assert.match(result, /<img/);
});

test("normal http image sources are untouched", async () => {
  let called = false;
  const result = await hostInlineImages(
    `<img src="https://example.com/photo.jpg" alt="photo">`,
    {
      host: async () => {
        called = true;
        return "should-not-be-used";
      },
    }
  );
  assert.equal(called, false);
  assert.match(result, /src="https:\/\/example\.com\/photo\.jpg"/);
});
