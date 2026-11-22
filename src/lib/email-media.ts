/** Make embedded image sources safe and resolvable in an outgoing email. */

interface HostOptions {
  host: (bytes: Buffer, mimeType: string) => Promise<string>;
}

const SRC_RE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

export async function hostInlineImages(
  html: string,
  opts: HostOptions
): Promise<string> {
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)];
  let out = "";
  let cursor = 0;

  for (const match of tags) {
    const tag = match[0];
    const index = match.index ?? 0;
    out += html.slice(cursor, index);
    cursor = index + tag.length;

    const srcMatch = tag.match(SRC_RE);
    if (!srcMatch) {
      out += tag;
      continue;
    }
    const src = (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? "").trim();

    let replacement: string | null = null;
    if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(src)) {
      const mimeType = src.match(/^data:([^;]+);base64,/i)?.[1] ?? "image/png";
      const bytes = Buffer.from(src.slice(src.indexOf(",") + 1), "base64");
      replacement = await opts.host(bytes, mimeType);
    } else if (/^(blob:|data:)/i.test(src)) {
      replacement = "";
    }

    if (replacement === null) {
      out += tag;
    } else if (replacement === "") {
      out += tag.replace(SRC_RE, "");
    } else {
      out += tag.replace(SRC_RE, `src="${replacement}"`);
    }
  }

  out += html.slice(cursor);
  return out;
}
