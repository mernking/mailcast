/** Pure tracking helpers shared by the send path and the tracking endpoint. */

interface EventLike {
  recipientId: string;
  campaignId: string;
  kind: string;
}

export function hasOpenEvent(
  events: EventLike[],
  recipientId: string,
  campaignId: string
): boolean {
  return events.some(
    (event) =>
      event.kind === "open" &&
      event.recipientId === recipientId &&
      event.campaignId === campaignId
  );
}

/** Decode the HTML entities email clients put into href attributes. */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCharCode(Number(code))
    );
}

/** Append UTM parameters to a click destination without dropping its query. */
export function withUtm(url: string, campaignId: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("utm_source", "mailcast");
    parsed.searchParams.set("utm_medium", "email");
    parsed.searchParams.set("utm_campaign", campaignId);
    return parsed.toString();
  } catch {
    return url;
  }
}
