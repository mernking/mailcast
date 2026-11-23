/**
 * Supabase Storage for email media.
 *
 * Server-side only. The secret key is read from SUPABASE_SECRET_KEY and must
 * never be exposed to the browser (no NEXT_PUBLIC_ prefix).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "email-media";
const MEDIA_PREFIX = "images";

export interface StoredImage {
  path: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase media storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env."
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function isSupportedImageMime(mime: string): boolean {
  return mime.startsWith("image/") && mime in MIME_EXT;
}

function extensionFor(mimeType: string): string {
  return MIME_EXT[mimeType.toLowerCase()] ?? "png";
}

/**
 * Upload raw image bytes. Path is content-addressed (sha256), so re-uploading
 * the same image is idempotent and never creates duplicates.
 */
export async function uploadImageBytes(
  bytes: Uint8Array,
  mimeType: string
): Promise<StoredImage> {
  if (!isSupportedImageMime(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
  const path = `${MEDIA_PREFIX}/${hash}.${extensionFor(mimeType)}`;

  const { error } = await getClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType: mimeType,
      upsert: true,
      cacheControl: "31536000", // 1 year immutable, path is content-addressed
    });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  return {
    path,
    url: getPublicUrl(path),
    mimeType,
    size: bytes.length,
    createdAt: new Date().toISOString(),
  };
}

/** Parse a `data:image/...;base64,...` URI and upload it. */
export async function uploadDataUri(dataUri: string): Promise<StoredImage> {
  const match = dataUri.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
  if (!match) throw new Error("Invalid image data URI");
  const [, mimeType, base64] = match;
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return uploadImageBytes(bytes, mimeType);
}

/** Return the permanent public URL for a stored path. */
export function getPublicUrl(path: string): string {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  if (!url) throw new Error("SUPABASE_URL is not configured");
  return `${url}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/**
 * Replace every inline `data:` image in HTML with a permanent Supabase URL.
 * Identical images are uploaded once. External URLs, cid: and tracking pixels
 * are left untouched.
 */
/**
 * Pure HTML rewriter: replaces data: image srcs with URLs from `upload`.
 * Identical data URIs are uploaded once. Exported for testing.
 */
export async function replaceDataUris(
  html: string,
  upload: (dataUri: string) => Promise<{ url: string }>
): Promise<string> {
  const dataUriRegex = /src\s*=\s*(["'])data:(image\/[a-z0-9.+-]+);base64,([\s\S]*?)\1/gi;
  /** data URI -> placeholder token (one per unique image) */
  const placeholders = new Map<string, string>();
  /** placeholder token -> final public URL, filled after uploads */
  const resolved = new Map<string, string>();

  const rewritten = html.replace(
    dataUriRegex,
    (_full, quote: string, mimeType: string, base64: string) => {
      const dataUri = `data:${mimeType};base64,${base64}`;
      let token = placeholders.get(dataUri);
      if (!token) {
        token = `__SUPABASE_MEDIA_${placeholders.size}__`;
        placeholders.set(dataUri, token);
      }
      return `src=${quote}${token}${quote}`;
    }
  );

  if (placeholders.size === 0) return html;

  await Promise.all(
    Array.from(placeholders.entries()).map(async ([dataUri, token]) => {
      const stored = await upload(dataUri);
      resolved.set(token, stored.url);
    })
  );

  let out = rewritten;
  for (const [token, url] of resolved) {
    out = out.split(token).join(url);
  }
  return out;
}

export function hostInlineImages(html: string): Promise<string> {
  return replaceDataUris(html, uploadDataUri);
}

/** List uploaded media, newest first. */
export async function listImages(): Promise<StoredImage[]> {
  const { data, error } = await getClient()
    .storage.from(MEDIA_BUCKET)
    .list(MEDIA_PREFIX, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) throw new Error(`Supabase list failed: ${error.message}`);

  return (data ?? [])
    .filter((item) => item.id && !item.name.endsWith("/"))
    .map((item) => ({
      path: `${MEDIA_PREFIX}/${item.name}`,
      url: getPublicUrl(`${MEDIA_PREFIX}/${item.name}`),
      mimeType: item.metadata?.mimetype ?? "image/png",
      size: item.metadata?.size ?? 0,
      createdAt: item.created_at ?? "",
    }));
}

/** Delete one media object by its stored path. */
export async function deleteImage(path: string): Promise<void> {
  if (!path.startsWith(`${MEDIA_PREFIX}/`)) {
    throw new Error("Invalid media path");
  }
  const { error } = await getClient()
    .storage.from(MEDIA_BUCKET)
    .remove([path]);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}
