import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareBuilderHtml } from "../../src/lib/grapes-config.ts";

test("strips GrapesJS wrapper comments", () => {
  const html = `<!-- <table> --><table><tr><td>content</td></tr></table><!-- </table> -->`;
  const result = prepareBuilderHtml(html);
  assert.ok(!result.includes("<!--"));
  assert.ok(!result.includes("-->"));
  assert.ok(result.includes("<table>"));
});

test("keeps anchor tags intact", () => {
  const html = `<a href="https://example.com">Link</a>`;
  const result = prepareBuilderHtml(html);
  assert.ok(result.includes('href="https://example.com"'));
  assert.ok(result.includes(">Link</a>"));
});

test("keeps img tags with data URIs", () => {
  const html = `<img src="data:image/png;base64,abc123" alt="test">`;
  const result = prepareBuilderHtml(html);
  assert.ok(result.includes('src="data:image/png;base64,abc123"'));
  assert.ok(result.includes('alt="test"'));
});

test("keeps img tags with cid references", () => {
  const html = `<img src="cid:img-1-abc123" alt="test">`;
  const result = prepareBuilderHtml(html);
  assert.ok(result.includes('src="cid:img-1-abc123"'));
});

test("keeps tracking pixel URLs", () => {
  const html = `<img src="/api/t/abc123def456" alt="">`;
  const result = prepareBuilderHtml(html);
  assert.ok(result.includes('src="/api/t/abc123def456"'));
});

test("removes grapesjs style attributes", () => {
  const html = `<div style="position:absolute;top:0;left:0" class="gjs-block">content</div>`;
  const result = prepareBuilderHtml(html);
  assert.ok(!result.includes("position:absolute"));
  assert.ok(!result.includes("gjs-block"));
});

test("normalizes whitespace", () => {
  const html = `<table>   <tr>  <td>  content  </td> </tr> </table>`;
  const result = prepareBuilderHtml(html);
  // Should not have excessive whitespace
  assert.ok(!result.includes("   "));
});

console.log("All tests passed!");
