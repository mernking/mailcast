import { test } from "node:test";
import assert from "node:assert/strict";
import { inlineImagesToAttachments } from "../../src/lib/email-cid.ts";

test("CID pipeline: data: images become cid, tracking pixel stays external", () => {
  // HTML with data: image and tracking pixel
  const html = `
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="logo">
    <img src="/api/t/open-token-123" alt="" width="1" height="1">
  `;

  // Step 1: Convert data: images to CID
  const { html: cidHtml, attachments } = inlineImagesToAttachments(html);

  assert.ok(cidHtml.includes('src="cid:'), "data: image should become cid:");
  assert.ok(!cidHtml.includes("data:image/png;base64"), "data: URI should be removed");
  assert.equal(attachments.length, 1, "should have 1 attachment");
  assert.ok(attachments[0].cid.startsWith("img-"), "cid should have img- prefix");
  assert.equal(attachments[0].contentType, "image/png", "content type should be image/png");

  // Step 2: Tracking pixel should remain external
  assert.ok(cidHtml.includes('/api/t/open-token-123'), "tracking pixel should stay external");

  console.log("✓ CID pipeline works correctly");
});

test("Multiple data: images get different cids", () => {
  const html = `
    <img src="data:image/png;base64,abc123">
    <img src="data:image/jpeg;base64,def456">
  `;
  const { html: cidHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.equal(attachments.length, 2, "should have 2 attachments");
  assert.notEqual(attachments[0].cid, attachments[1].cid, "cids should differ");
  
  const cid1 = attachments[0].cid;
  const cid2 = attachments[1].cid;
  assert.ok(cidHtml.includes(`cid:${cid1}`), "first cid in html");
  assert.ok(cidHtml.includes(`cid:${cid2}`), "second cid in html");
  
  console.log("✓ Multiple images get unique cids");
});

test("blob: URLs are stripped", () => {
  const html = `<img src="blob:https://example.com/abc123">`;
  const { html: cidHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.ok(!cidHtml.includes("blob:"), "blob: should be removed");
  assert.equal(attachments.length, 0, "no attachments for blob");
  
  console.log("✓ blob: URLs stripped");
});

test("https images untouched", () => {
  const html = `<img src="https://cdn.example.com/image.jpg">`;
  const { html: cidHtml, attachments } = inlineImagesToAttachments(html);
  
  assert.ok(cidHtml.includes("https://cdn.example.com/image.jpg"), "https image stays");
  assert.equal(attachments.length, 0, "no attachments for https");
  
  console.log("✓ https images untouched");
});

console.log("All CID pipeline tests passed!");
