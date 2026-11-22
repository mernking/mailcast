import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTemplate } from "../../src/lib/template-validation.ts";

test("missing name rejected", () => {
  const result = validateTemplate({ name: "", project: "{}" });
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("name"));
});

test("missing both project and html rejected", () => {
  const result = validateTemplate({ name: "Test" });
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("project") || result.error?.includes("html"));
});

test("valid with project accepted", () => {
  const result = validateTemplate({ name: "Test", project: "{}" });
  assert.equal(result.ok, true);
});

test("valid with html accepted", () => {
  const result = validateTemplate({ name: "Test", html: "<p>Hello</p>" });
  assert.equal(result.ok, true);
});

test("valid with both accepted", () => {
  const result = validateTemplate({ name: "Test", project: "{}", html: "<p>Hello</p>" });
  assert.equal(result.ok, true);
});

console.log("All tests passed!");
