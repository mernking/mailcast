import { test } from "node:test";
import assert from "node:assert/strict";
import { inlineImagesToAttachments } from "../../src/lib/email-cid.ts";

test("data:image/png base64 becomes cid and yields attachment", () => {
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const html = `<img src="data:image/png;base64,${pngBase64}" alt="test">`;
  const { html: outHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.ok(outHtml.includes("cid:"), "src should become cid:");
  assert.equal(attachments.length, 1, "should have one attachment");
  assert.ok(attachments[0].cid.startsWith("img-"), "cid should have img- prefix");
  assert.equal(attachments[0].contentType, "image/png", "content type should be image/png");
  assert.ok(Buffer.isBuffer(attachments[0].content), "content should be Buffer");
});

test("blob: src is removed", () => {
  const html = `<img src="blob:https://example.com/abc123" alt="test">`;
  const { html: outHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.ok(!outHtml.includes("blob:"), "blob: should be removed");
  assert.equal(attachments.length, 0, "no attachments for blob");
});

test("tracking pixel URL stays external", () => {
  const html = `<img src="/api/t/abc123def456" alt="tracker">`;
  const { html: outHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.ok(outHtml.includes("/api/t/abc123def456"), "tracking pixel should stay external");
  assert.equal(attachments.length, 0, "no attachments for tracking pixel");
});

test("normal https image is untouched", () => {
  const html = `<img src="https://cdn.example.com/image.jpg" alt="external">`;
  const { html: outHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.ok(outHtml.includes("https://cdn.example.com/image.jpg"), "https image should stay");
  assert.equal(attachments.length, 0, "no attachments for https");
});

test("multiple data images get different cids", () => {
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const html = `<img src="data:image/png;base64,${pngBase64}"><img src="data:image/jpeg;base64,/9j/4AAQ">`;
  const { html: outHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.equal(attachments.length, 2, "should have two attachments");
  assert.notEqual(attachments[0].cid, attachments[1].cid, "cids should differ");
});

test("data:image/gif works", () => {
  const gifBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const html = `<img src="data:image/gif;base64,${gifBase64}">`;
  const { html: outHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.ok(outHtml.includes("cid:"), "should become cid");
  assert.equal(attachments[0].contentType, "image/gif", "content type should be image/gif");
});

test("data:image/webp works", () => {
  const webpBase64 = "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
  const html = `<img src="data:image/webp;base64,${webpBase64}">`;
  const { html: outHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.ok(outHtml.includes("cid:"), "should become cid");
  assert.equal(attachments[0].contentType, "image/webp", "content type should be image/webp");
});

console.log("All tests passed!");
