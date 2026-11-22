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
