import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,
  mapCsvRows,
  mergeGroups,
  defaultColumnMapping,
  type ColumnMapping,
} from "../../src/lib/contact-import.ts";

test("parseCsv detects a header and keeps commas inside quoted fields", () => {
  const parsed = parseCsv(
    'name,email,tags\n"Doe, Jane",jane@example.com,founders\nAlex,alex@example.com,weekly\n'
  );
  assert.deepEqual(parsed.headers, ["name", "email", "tags"]);
  assert.deepEqual(parsed.rows, [
    ["Doe, Jane", "jane@example.com", "founders"],
    ["Alex", "alex@example.com", "weekly"],
  ]);
});

test("mapCsvRows maps name, email and tags by header name", () => {
  const parsed = parseCsv("name,email,tags\nJane,jane@example.com,founders\n");
  const result = mapCsvRows(
    parsed.headers,
    parsed.rows,
    { name: "name", email: "email", tags: "tags" },
    []
  );
  assert.deepEqual(result, {
    contacts: [
      {
        email: "jane@example.com",
        name: "Jane",
        tags: "founders",
        telegram: null,
        groups: [],
      },
    ],
    skipped: 0,
  });
});

test("mapCsvRows splits a group column and merges default groups", () => {
  const parsed = parseCsv('email,groups\njane@example.com,"News, Other"\n');
  const result = mapCsvRows(
    parsed.headers,
    parsed.rows,
    { email: "email", groups: "group" },
    ["Default"]
  );
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0]?.email, "jane@example.com");
  assert.deepEqual(result.contacts[0]?.groups, ["Default", "News", "Other"]);
});

test("defaultColumnMapping guesses fields from header names", () => {
  assert.deepEqual(
    defaultColumnMapping(["Full Name", "Email Address", "Tags", "Telegram", "Group", "Unknown"]),
    {
      "Full Name": "name",
      "Email Address": "email",
      Tags: "tags",
      Telegram: "telegram",
      Group: "group",
      Unknown: "skip",
    }
  );
});

test("mergeGroups returns a case-insensitive union", () => {
  assert.deepEqual(mergeGroups(["News", "Other"], ["news", "Weekly"]), [
    "News",
    "Other",
    "Weekly",
  ]);
});

test("mapCsvRows skips invalid and duplicate emails", () => {
  const parsed = parseCsv(
    "email,name\nnot-an-email,Bad\njane@example.com,Jane\nJANE@example.com,Duplicate\n"
  );
  const mapping: Record<string, ColumnMapping> = { email: "email", name: "name" };
  const result = mapCsvRows(parsed.headers, parsed.rows, mapping, []);
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0]?.name, "Jane");
  assert.equal(result.skipped, 2);
});
