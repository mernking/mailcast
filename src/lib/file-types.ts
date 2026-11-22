/** Upload policy for images embedded in campaign emails. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export function isAllowedImage(mimeType: string, size: number): boolean {
  return (
    ALLOWED_MIME_TYPES.has(mimeType.toLowerCase()) &&
    size > 0 &&
    size <= MAX_IMAGE_BYTES
  );
}
