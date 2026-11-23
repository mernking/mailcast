import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session-token";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await deleteSession(token);
    } catch {
      /* best effort */
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
