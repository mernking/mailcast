import crypto from "crypto";

/**
 * AES-256-GCM encryption helpers for storing the Gmail app password
 * securely at rest. The key is read from ENCRYPTION_KEY (hex, 32 bytes)
 * with a stable fallback for local development.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, "hex");
    if (buf.length === 32) return buf;
  }
  // Stable dev fallback derived from a fixed seed. Replace via env in prod.
  return crypto.createHash("sha256").update("mailcast-dev-key-do-not-use-in-prod").digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), enc.toString("hex"), tag.toString("hex")].join(":");
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, dataHex, tagHex] = parts;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return dec.toString("utf8");
}

/** Returns a masked preview of an email address for safe display. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${"*".repeat(Math.max(2, user.length - 2))}@${domain}`;
}
