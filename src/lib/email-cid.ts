/**
 * Convert inline data: images to CID attachments for email.
 * Also strips blob: URLs (not supported in email).
 * Returns rewritten HTML and an array of nodemailer-compatible attachments.
 */

export interface CidAttachment {
  cid: string;
  filename: string;
  content: Buffer;
  contentType: string;
}

const DATA_URI_REGEX = /src\s*=\s*(["'])data:([^;]+);base64,([^"']+)\1/gi;
const BLOB_URI_REGEX = /src\s*=\s*(["'])blob:[^"']+\1/gi;

/**
 * Convert data: URI images in HTML to cid: references.
 * Also removes blob: URIs.
 * @param html - HTML string with potential data: or blob: URIs
 * @returns { html: rewritten HTML, attachments: nodemailer attachments }
 */
export function inlineImagesToAttachments(html: string): { html: string; attachments: CidAttachment[] } {
  const attachments: CidAttachment[] = [];
  let cidCounter = 0;

  // First, convert data: URIs to cid:
  let rewrittenHtml = html.replace(DATA_URI_REGEX, (match, quote, mimeType, base64Data) => {
    cidCounter++;
    const cid = `img-${cidCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Decode base64
    const buffer = Buffer.from(base64Data, "base64");
    
    // Determine filename from mime type
    const ext = mimeType.split("/")[1] || "png";
    const filename = `image-${cidCounter}.${ext}`;
    
    attachments.push({
      cid,
      filename,
      content: buffer,
      contentType: mimeType,
    });
    
    return `src=${quote}cid:${cid}${quote}`;
  });

  // Then strip blob: URIs (replace with empty src to remove the image)
  rewrittenHtml = rewrittenHtml.replace(BLOB_URI_REGEX, 'src=""');

  return { html: rewrittenHtml, attachments };
}
