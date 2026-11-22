import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTrackedHtml } from "../../src/lib/tracking-html.ts";

test("http links are rewritten through the tracking endpoint", () => {
  const seen: string[] = [];
  const result = buildTrackedHtml(
    `<p><a href="https://example.com/a?x=1">visit</a></p>`,
    {
      baseUrl: "https://mail.example.com",
      openToken: "OPEN1",
      tokenForUrl: (url) => {
        seen.push(url);
        return "T1";
      },
    }
  );
  assert.deepEqual(seen, ["https://example.com/a?x=1"]);
  assert.match(
    result,
    /href="https:\/\/mail\.example\.com\/api\/t\/T1"/
  );
  assert.doesNotMatch(result, /example\.com\/a\?x=1/);
});

test("an open pixel is appended", () => {
  const result = buildTrackedHtml(`<p>Hello</p>`, {
    baseUrl: "https://mail.example.com",
    openToken: "OPEN1",
    tokenForUrl: () => "T",
  });
  assert.match(
    result,
    /<img[^>]*src="https:\/\/mail\.example\.com\/api\/t\/OPEN1"[^>]*>/
  );
  assert.match(result, /width="1"/);
});

test("links stay untouched when click tracking is off", () => {
  const result = buildTrackedHtml(`<a href="https://example.com/a">visit</a>`, {
    baseUrl: "https://mail.example.com",
    openToken: "OPEN1",
    tokenForUrl: undefined,
  });
  assert.match(result, /href="https:\/\/example\.com\/a"/);
  assert.doesNotMatch(result, /href="https:\/\/mail\.example\.com\/api\/t\//);
});

test("no open pixel is added when open tracking is off", () => {
  const result = buildTrackedHtml(`<p>Hello</p>`, {
    baseUrl: "https://mail.example.com",
    openToken: undefined,
    tokenForUrl: () => "T",
  });
  assert.doesNotMatch(result, /<img/);
});

test("mailto links are not rewritten", () => {
  const result = buildTrackedHtml(
    `<a href="mailto:someone@example.com">mail</a>`,
    {
      baseUrl: "https://mail.example.com",
      openToken: "OPEN1",
      tokenForUrl: () => "T",
    }
  );
  assert.match(result, /href="mailto:someone@example.com"/);
});
