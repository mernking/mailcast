import { test } from "node:test";
import assert from "node:assert/strict";
import { getPublicBaseUrl } from "../../src/lib/public-url.ts";

const originalAppUrl = process.env.APP_URL;

function withAppUrl(value: string | undefined, run: () => void) {
  if (value === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = value;
  try {
    run();
  } finally {
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
  }
}

test("APP_URL wins and loses its trailing slash", () => {
  withAppUrl("https://mail.example.com/", () => {
    assert.equal(getPublicBaseUrl(new Headers()), "https://mail.example.com");
  });
});

test("forwarded proto and host are used", () => {
  withAppUrl(undefined, () => {
    const headers = new Headers({
      "x-forwarded-proto": "https",
      "x-forwarded-host": "track.example.com",
      host: "localhost:3000",
    });
    assert.equal(getPublicBaseUrl(headers), "https://track.example.com");
  });
});

test("host fallback is used without forwarded headers", () => {
  withAppUrl(undefined, () => {
    assert.equal(
      getPublicBaseUrl(new Headers({ host: "localhost:3000" })),
      "http://localhost:3000"
    );
  });
});

test("no host yields an empty string", () => {
  withAppUrl(undefined, () => {
    assert.equal(getPublicBaseUrl(new Headers()), "");
  });
});
