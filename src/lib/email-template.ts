import { markdownToHtml, markdownToText } from "./markdown";

export type EmailContentType = "markdown" | "html";

interface RenderOptions {
  contentType?: EmailContentType;
  preheader?: string;
  unsubscribeEmail?: string;
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Strip content that is unsafe or undesirable in transactional/newsletter
 * emails: scripts, styles, event handlers, javascript: URLs, and form/meta
 * elements. Keeps tables, inline styles, images and links intact.
 *
 * This is a pragmatic allowlist-by-removal sanitizer for HTML authored by
 * the account owner (not arbitrary user input from the public).
 */
export function sanitizeEmailHtml(html: string): string {
  let out = html;
  // Drop entire script/style/iframe/object/embed/form/noscript blocks.
  out = out.replace(
    /<(script|style|iframe|object|embed|form|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ""
  );
  // Drop standalone void/unsafe elements.
  out = out.replace(
    /<(input|button|textarea|select|option|meta|link|base|applet|frame|frameset)\b[^>]*\/?>/gi,
    ""
  );
  // Remove all on* event handler attributes.
  out = out.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Neutralize javascript:/vbscript:/data:text-html URLs in href/src.
  out = out.replace(
    /(href|src)\s*=\s*(["'])(?:javascript|vbscript|data:text\/html)[^"']*\2/gi,
    '$1=$2#$2'
  );
  return out;
}

/** Convert an HTML string to plain text (rough, for the text/plain part). */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Render a full HTML email document with inline styles (required for email
 * clients). When contentType is "html", the body is sanitized and used as-is;
 * otherwise it is converted from markdown.
 */
export function renderEmailHtml(content: string, opts: RenderOptions = {}): string {
  const bodyHtml =
    opts.contentType === "html"
      ? sanitizeEmailHtml(content)
      : markdownToHtml(content);
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(opts.preheader)}</div>`
    : "";

  const footer = opts.unsubscribeEmail
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ececec;margin-top:32px;padding-top:24px;padding-bottom:24px">
        <tr>
          <td align="center" style="font-family:${FONT_STACK};font-size:12px;line-height:18px;color:#888">
            You received this email because you subscribed to our newsletter.<br/>
            <a href="mailto:${escapeHtml(opts.unsubscribeEmail)}?subject=Unsubscribe" style="color:#888;text-decoration:underline">Unsubscribe</a>
            &nbsp;&middot;&nbsp; Reply to this email to get in touch.
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light only"/>
<title>Newsletter</title>
</head>
<body style="margin:0;padding:0;background-color:#faf9f6;font-family:${FONT_STACK};color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:14px;border:1px solid #ececec;overflow:hidden">
          <tr>
            <td style="padding:40px 40px 8px 40px">
              ${preheader}
              <div style="font-family:${FONT_STACK};font-size:16px;line-height:26px;color:#1a1a1a">
                ${styledBody(bodyHtml)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px">${footer}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Post-process body HTML so common tags get email-safe inline styles.
 * If the author already supplied inline styles on a tag, leave them — the
 * added style attribute still applies broadly for editor-generated HTML.
 */
function styledBody(html: string): string {
  return html
    .replace(/<h1([^>]*)>/g, '<h1$1 style="font-size:28px;line-height:34px;font-weight:700;margin:0 0 16px 0;letter-spacing:-0.01em">')
    .replace(/<h2([^>]*)>/g, '<h2$1 style="font-size:22px;line-height:28px;font-weight:700;margin:28px 0 12px 0;letter-spacing:-0.01em">')
    .replace(/<h3([^>]*)>/g, '<h3$1 style="font-size:18px;line-height:24px;font-weight:600;margin:24px 0 10px 0">')
    .replace(/<p([^>]*)>/g, '<p$1 style="margin:0 0 16px 0">')
    .replace(/<ul([^>]*)>/g, '<ul$1 style="margin:0 0 16px 0;padding-left:22px">')
    .replace(/<ol([^>]*)>/g, '<ol$1 style="margin:0 0 16px 0;padding-left:22px">')
    .replace(/<li([^>]*)>/g, '<li$1 style="margin:0 0 6px 0;line-height:26px">')
    .replace(/<a\s/g, '<a style="color:#1a1a1a;text-decoration:underline;font-weight:600" ')
    .replace(/<strong>/g, '<strong style="font-weight:700">')
    .replace(/<blockquote([^>]*)>/g, '<blockquote$1 style="margin:0 0 16px 0;padding:8px 0 8px 16px;border-left:3px solid #ececec;color:#555">')
    .replace(/<hr\s*\/?>/g, '<hr style="border:none;border-top:1px solid #ececec;margin:24px 0"/>')
    .replace(/<img\s/g, '<img style="max-width:100%;height:auto;border-radius:10px;margin:0 0 16px 0" ')
    .replace(/<code>/g, '<code style="background:#f4f3ef;padding:2px 5px;border-radius:4px;font-size:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailText(content: string, contentType: EmailContentType = "markdown"): string {
  return contentType === "html" ? htmlToText(content) : markdownToText(content);
}
