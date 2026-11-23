import { test } from "node:test";
import assert from "node:assert/strict";
import { renderBlogHtml, slugify, stripMergeTags } from "../../src/lib/blog-render.ts";

test("slugify produces a clean URL slug", () => {
  assert.equal(slugify("The Q1 Report!"), "the-q1-report");
  assert.equal(slugify("Hello — World"), "hello-world");
  assert.equal(slugify(""), "post");
});

test("stripMergeTags replaces personalization with neutral text", () => {
  const out = stripMergeTags("Hi {{first_name}}, welcome {{name}} ({{email}})");
  assert.ok(out.includes("Hi there"));
  assert.ok(!out.includes("{{"));
});

test("renderBlogHtml strips scripts and tracking pixels", () => {
  const html = `<script>alert(1)</script><p>Hello {{name}}</p><img src="/api/t/token123">`;
  const out = renderBlogHtml(html, "html");
  assert.ok(!out.includes("<script"));
  assert.ok(!out.includes("{{"));
  assert.ok(!out.includes("/api/t/token123"));
  assert.ok(out.includes("Hello there"));
});

test("renderBlogHtml converts markdown", () => {
  const out = renderBlogHtml("# Title\n\nHello **world**", "markdown");
  assert.ok(out.includes("<h1"));
  assert.ok(out.includes("<strong>world</strong>"));
});

console.log("All blog render tests passed!");
