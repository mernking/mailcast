import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session-token";

export const dynamic = "force-dynamic";

// Minimal in-memory throttle: 10 attempts / 15 minutes per IP.
const attempts = new Map<string, { count: number; resetAt: number }>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = (body as { email?: string })?.email?.trim() ?? "";
  const password = (body as { password?: string })?.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const userId = await authenticate(email, password);
    if (!userId) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const token = await createSession(userId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
