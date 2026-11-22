import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasOpenEvent,
  withUtm,
  decodeHtmlEntities,
} from "../../src/lib/tracking.ts";

const event = (recipientId: string, campaignId: string, kind: string) => ({
  recipientId,
  campaignId,
  kind,
});

test("an existing open for the same recipient and campaign dedupes", () => {
  assert.equal(
    hasOpenEvent(
      [event("r1", "c1", "open"), event("r2", "c1", "open")],
      "r1",
      "c1"
    ),
    true
  );
});

test("an open for another campaign or a click does not dedupe", () => {
  assert.equal(
    hasOpenEvent([event("r1", "c2", "open"), event("r1", "c1", "click")], "r1", "c1"),
    false
  );
});

test("no events means no prior open", () => {
  assert.equal(hasOpenEvent([], "r1", "c1"), false);
});

test("HTML entities in a link are decoded before redirect", () => {
  assert.equal(
    decodeHtmlEntities("https://example.com/a?x=1&amp;y=2"),
    "https://example.com/a?x=1&y=2"
  );
  assert.equal(decodeHtmlEntities("https://example.com/?a=&#39;b&#39;"), "https://example.com/?a='b'");
});

test("UTM parameters are added without losing existing query values", () => {
  const result = withUtm("https://example.com/page?x=1", "camp-1");
  const url = new URL(result);
  assert.equal(url.searchParams.get("x"), "1");
  assert.equal(url.searchParams.get("utm_source"), "mailcast");
  assert.equal(url.searchParams.get("utm_medium"), "email");
  assert.equal(url.searchParams.get("utm_campaign"), "camp-1");
});
