/** Where a campaign's current editor state is persisted before sending. */

export function getPersistRequest(
  isNew: boolean,
  campaignId: string
): { method: "POST" | "PATCH"; url: string } {
  return isNew
    ? { method: "POST", url: "/api/campaigns" }
    : { method: "PATCH", url: `/api/campaigns/${campaignId}` };
}
