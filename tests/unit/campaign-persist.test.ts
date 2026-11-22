import { test } from "node:test";
import assert from "node:assert/strict";
import { getPersistRequest } from "../../src/lib/campaign-persist.ts";

test("a new campaign is persisted with POST to the collection", () => {
  assert.deepEqual(getPersistRequest(true, "new"), {
    method: "POST",
    url: "/api/campaigns",
  });
});

test("an existing campaign is persisted with PATCH to its own URL", () => {
  assert.deepEqual(getPersistRequest(false, "camp-123"), {
    method: "PATCH",
    url: "/api/campaigns/camp-123",
  });
});
