import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import {
  SESSION_COOKIE,
  signSessionToken,
  verifySessionToken,
} from "./session-token";

export { SESSION_COOKIE } from "./session-token";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Hash a password with bcrypt (12 rounds). */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Verify a password against a bcrypt hash. */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a signed session token and persist its hash in the database so it can
 * be revoked by deleting the row.
 */
export async function createSession(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const jti = hashToken(raw).slice(0, 16);
  // Sign first, then store the hash of exactly what the browser will send.
  const token = await signSessionToken(userId, jti);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.adminSession.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  return token;
}

/** Revoke the current session in the database. */
export async function deleteSession(token: string): Promise<void> {
  await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

/** Resolve the current signed-in admin from the request cookie. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

/** Validate email + password. Returns the user id on success. */
export async function authenticate(
  email: string,
  password: string
): Promise<string | null> {
  const user = await db.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user.id : null;
}
