import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { verifySender } from "@/lib/gmail";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicSender(s: {
  id: string;
  email: string;
  fromName: string;
  verified: boolean;
  createdAt: Date;
}) {
  return {
    id: s.id,
    email: s.email,
    fromName: s.fromName,
    verified: s.verified,
    createdAt: s.createdAt,
  };
}

export async function GET() {
  try {
    const senders = await db.senderAccount.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(senders.map(publicSender));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load senders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, fromName, password } = (body ?? {}) as {
      email?: string;
      fromName?: string;
      password?: string;
    };

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!password || password.trim().length === 0) {
      return NextResponse.json({ error: "App password is required" }, { status: 400 });
    }
    if (!fromName || fromName.trim().length === 0) {
      return NextResponse.json({ error: "From name is required" }, { status: 400 });
    }

    const passwordEnc = encrypt(password.trim());

    // Create the account first so it exists even if verification fails.
    const sender = await db.senderAccount.create({
      data: {
        email: email.trim().toLowerCase(),
        fromName: fromName.trim(),
        passwordEnc,
        verified: false,
      },
    });

    // Attempt verification; on failure keep verified=false but warn the user.
    let verified = false;
    let warning: string | undefined;
    try {
      await verifySender({
        email: sender.email,
        fromName: sender.fromName,
        passwordEnc: sender.passwordEnc,
      });
      verified = true;
      await db.senderAccount.update({
        where: { id: sender.id },
        data: { verified: true },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      warning = `Saved, but verification failed: ${message}. You can fix the password later.`;
    }

    const refreshed = await db.senderAccount.findUniqueOrThrow({ where: { id: sender.id } });
    return NextResponse.json({ ...publicSender(refreshed), warning }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add sender";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
