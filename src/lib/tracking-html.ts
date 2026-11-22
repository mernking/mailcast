/** Rewrite an email's HTML with first-party tracking links and an open pixel. */

interface TrackOptions {
  baseUrl: string;
  /** Omit when open tracking is disabled. */
  openToken?: string;
  /** Omit when click tracking is disabled. */
  tokenForUrl?: (url: string) => string;
}

export function buildTrackedHtml(html: string, opts: TrackOptions): string {
  const tracked = opts.tokenForUrl
    ? html.replace(
        /\bhref\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi,
        (_match, quote: string, url: string) => {
          const token = opts.tokenForUrl?.(url) ?? "";
          return `href=${quote}${opts.baseUrl}/api/t/${token}${quote}`;
        }
      )
    : html;

  if (!opts.openToken) return tracked;

  const pixel = `<img src="${opts.baseUrl}/api/t/${opts.openToken}" width="1" height="1" alt="" style="display:none">`;
  if (/<\/body\s*>/i.test(tracked)) {
    return tracked.replace(/<\/body\s*>/i, `${pixel}</body>`);
  }
  return `${tracked}${pixel}`;
}
