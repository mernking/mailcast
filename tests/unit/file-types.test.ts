import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedImage } from "../../src/lib/file-types.ts";

const MAX = 5 * 1024 * 1024;

test("png under the limit is allowed", () => {
  assert.equal(isAllowedImage("image/png", MAX - 1), true);
});

test("a file over the limit is rejected", () => {
  assert.equal(isAllowedImage("image/png", MAX + 1), false);
});

test("jpeg, gif and webp are allowed", () => {
  assert.equal(isAllowedImage("image/jpeg", 1024), true);
  assert.equal(isAllowedImage("image/gif", 1024), true);
  assert.equal(isAllowedImage("image/webp", 1024), true);
});

test("non-image types are rejected", () => {
  assert.equal(isAllowedImage("application/pdf", 1024), false);
  assert.equal(isAllowedImage("image/svg+xml", 1024), false);
});
