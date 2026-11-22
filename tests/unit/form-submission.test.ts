import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSubmission } from "../../src/lib/form-submission.ts";

test("missing required fields are reported", () => {
  assert.deepEqual(
    validateSubmission({ email: "a@example.com" }, ["email", "company"]),
    { ok: false, missing: ["company"] }
  );
});

test("present required fields pass regardless of key case", () => {
  assert.deepEqual(
    validateSubmission({ EMAIL: "a@example.com", Company: "Acme" }, ["email", "company"]),
    { ok: true, missing: [] }
  );
});

test("extra keys are ignored and whitespace counts as missing", () => {
  assert.deepEqual(
    validateSubmission({ email: "a@example.com", company: "  ", junk: "x" }, ["email", "company"]),
    { ok: false, missing: ["company"] }
  );
});
