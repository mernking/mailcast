import { markdownToHtml, markdownToText } from "./markdown";

interface RenderOptions {
  preheader?: string;
  unsubscribeEmail?: string;
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Render a full HTML email document with inline styles (required for email
 * clients). Converts the markdown body, applies a clean editorial layout,
 * and appends a footer with unsubscribe / sender info for compliance.
 */
export function renderEmailHtml(md: string, opts: RenderOptions = {}): string {
  const bodyHtml = markdownToHtml(md);
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

/** Post-process marked HTML to inject email-safe inline styles. */
function styledBody(html: string): string {
  return html
    .replace(/<h1[^>]*>/g, '<h1 style="font-size:28px;line-height:34px;font-weight:700;margin:0 0 16px 0;letter-spacing:-0.01em">')
    .replace(/<\/h1>/g, "</h1>")
    .replace(/<h2[^>]*>/g, '<h2 style="font-size:22px;line-height:28px;font-weight:700;margin:28px 0 12px 0;letter-spacing:-0.01em">')
    .replace(/<\/h2>/g, "</h2>")
    .replace(/<h3[^>]*>/g, '<h3 style="font-size:18px;line-height:24px;font-weight:600;margin:24px 0 10px 0">')
    .replace(/<\/h3>/g, "</h3>")
    .replace(/<p[^>]*>/g, '<p style="margin:0 0 16px 0">')
    .replace(/<\/p>/g, "</p>")
    .replace(/<ul[^>]*>/g, '<ul style="margin:0 0 16px 0;padding-left:22px">')
    .replace(/<ol[^>]*>/g, '<ol style="margin:0 0 16px 0;padding-left:22px">')
    .replace(/<li[^>]*>/g, '<li style="margin:0 0 6px 0;line-height:26px">')
    .replace(/<a\s/g, '<a style="color:#1a1a1a;text-decoration:underline;font-weight:600" ')
    .replace(/<strong>/g, '<strong style="font-weight:700">')
    .replace(/<blockquote[^>]*>/g, '<blockquote style="margin:0 0 16px 0;padding:8px 0 8px 16px;border-left:3px solid #ececec;color:#555">')
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

export function renderEmailText(md: string): string {
  return markdownToText(md);
}
