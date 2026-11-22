import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileGroupMemberships } from "../../src/lib/group-memberships.ts";

test("new selections are added to current memberships", () => {
  assert.deepEqual(
    reconcileGroupMemberships(["a"], ["a", "b"]),
    { toAdd: ["b"], toRemove: [] }
  );
});

test("omitted memberships are removed", () => {
  assert.deepEqual(
    reconcileGroupMemberships(["a", "b"], ["a"]),
    { toAdd: [], toRemove: ["b"] }
  );
});

test("an empty selection removes every membership", () => {
  assert.deepEqual(
    reconcileGroupMemberships(["a", "b"], []),
    { toAdd: [], toRemove: ["a", "b"] }
  );
});
