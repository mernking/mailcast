/** Public origin used for hosted images and tracking links in emails. */

export function getPublicBaseUrl(headers: Headers): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const proto =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headers.get("host")?.trim();
  if (!host) return "";
  return `${proto}://${host}`;
}
