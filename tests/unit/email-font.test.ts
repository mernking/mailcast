import { test } from "node:test";
import assert from "node:assert/strict";
import { getFontStack, stripWrapperPadding } from "../../src/lib/email-font.ts";

test("default font is Helvetica/Arial", () => {
  const font = getFontStack();
  assert.ok(font.includes("Helvetica"));
  assert.ok(font.includes("Arial"));
});

test("helvetica option works", () => {
  const font = getFontStack("helvetica");
  assert.ok(font.includes("Helvetica"));
});

test("arial option works", () => {
  const font = getFontStack("arial");
  assert.ok(font.includes("Arial"));
});

test("verdana option works", () => {
  const font = getFontStack("verdana");
  assert.ok(font.includes("Verdana"));
});

test("georgia option works", () => {
  const font = getFontStack("georgia");
  assert.ok(font.includes("Georgia"));
});

test("unknown font falls back to Helvetica", () => {
  const font = getFontStack("comic-sans");
  assert.ok(font.includes("Helvetica"));
});

test("stripWrapperPadding removes padding:24px", () => {
  const html = '<td style="padding:24px 12px">test</td>';
  const stripped = stripWrapperPadding(html);
  assert.ok(!stripped.includes("padding:24px"));
});

test("stripWrapperPadding removes padding:40px", () => {
  const html = '<td style="padding:40px 40px 8px 40px">test</td>';
  const stripped = stripWrapperPadding(html);
  assert.ok(!stripped.includes("padding:40px"));
});
