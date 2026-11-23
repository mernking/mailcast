import { SignJWT, jwtVerify } from "jose";

/** Edge-safe session token helpers — no database or Node APIs. */
export const SESSION_COOKIE = "mailcast_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export function signSessionToken(userId: string, jti: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setJti(jti)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}
