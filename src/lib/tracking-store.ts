/** Create tracking tokens and rewrite a rendered email for one recipient. */

import { randomUUID } from "node:crypto";
import { db } from "./db";
import { buildTrackedHtml } from "./tracking-html";
import { decodeHtmlEntities, withUtm } from "./tracking";

export interface TrackingContext {
  baseUrl: string;
  campaignId: string;
  recipientId: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export async function prepareTrackedHtml(
  html: string,
  ctx: TrackingContext
): Promise<string> {
  let openToken: string | undefined;
  if (ctx.trackOpens) {
    openToken = randomUUID();
    await db.trackingToken.create({
      data: {
        token: openToken,
        campaignId: ctx.campaignId,
        recipientId: ctx.recipientId,
        kind: "open",
      },
    });
  }

  let tokenForUrl: ((url: string) => string) | undefined;
  if (ctx.trackClicks) {
    const urls = [
      ...new Set(
        [...html.matchAll(/\bhref\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi)]
          .map((match) => match[2])
          .filter((url): url is string => !!url)
      ),
    ];
    const tokens = new Map<string, string>();
    for (const rawUrl of urls) {
      const url = decodeHtmlEntities(rawUrl);
      const token = randomUUID();
      tokens.set(rawUrl, token);
      await db.trackingToken.create({
        data: {
          token,
          campaignId: ctx.campaignId,
          recipientId: ctx.recipientId,
          kind: "click",
          url: withUtm(url, ctx.campaignId),
        },
      });
    }
    tokenForUrl = (url) => tokens.get(url) ?? "";
  }

  return buildTrackedHtml(html, {
    baseUrl: ctx.baseUrl,
    openToken,
    tokenForUrl,
  });
}
