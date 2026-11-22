import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySendResult } from "../../src/lib/send-result.ts";

test("accepted recipients produce a successful classification", () => {
  const result = classifySendResult({
    messageId: "msg-1",
    accepted: ["a@example.com", "b@example.com"],
    rejected: [],
    pending: [],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.accepted, ["a@example.com", "b@example.com"]);
  assert.deepEqual(result.rejected, []);
  assert.deepEqual(result.pending, []);
  assert.equal(result.messageId, "msg-1");
  assert.equal(result.error, undefined);
});

test("a rejected recipient is a failure and appears in the error", () => {
  const result = classifySendResult({
    accepted: ["a@example.com"],
    rejected: ["b@example.com"],
    pending: [],
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /b@example\.com/);
});

test("pending recipients are a failure even with no rejections", () => {
  const result = classifySendResult({
    accepted: ["a@example.com"],
    rejected: [],
    pending: ["c@example.com"],
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /c@example\.com/);
});

test("no accepted recipients is a failure", () => {
  const result = classifySendResult({ accepted: [], rejected: [], pending: [] });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /no recipients/i);
});
