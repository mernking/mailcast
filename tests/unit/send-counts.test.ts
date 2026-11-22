import { test } from "node:test";
import assert from "node:assert/strict";
import { countRecipientStatuses } from "../../src/lib/send-result.ts";

test("counts sent and failed recipient rows", () => {
  assert.deepEqual(
    countRecipientStatuses([
      { status: "sent" },
      { status: "failed" },
      { status: "sent" },
      { status: "pending" },
    ]),
    { sentCount: 2, failedCount: 1 }
  );
});

test("an all-failed broadcast has no sent recipients", () => {
  assert.deepEqual(
    countRecipientStatuses([{ status: "failed" }, { status: "failed" }]),
    { sentCount: 0, failedCount: 2 }
  );
});
