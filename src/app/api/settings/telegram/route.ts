import { NextRequest, NextResponse } from "next/server";
import { getBotToken, setBotToken, verifyBotToken } from "@/lib/telegram";

export const dynamic = "force-dynamic";

interface GetResponse {
  configured: boolean;
  botUsername?: string;
  botFirstName?: string;
  error?: string;
}

/**
 * GET /api/settings/telegram
 *
 * Reports whether a Telegram bot token is configured. When a token is present,
 * we re-verify it against /getMe so the UI can display the bot's @username. If
 * verification fails (e.g. revoked token), `configured` is still true (the
 * value exists) but an `error` is returned so the user can disconnect.
 */
export async function GET() {
  try {
    const token = await getBotToken();
    if (!token) {
      const res: GetResponse = { configured: false };
      return NextResponse.json(res);
    }
    const info = await verifyBotToken(token);
    if (info.ok) {
      const res: GetResponse = {
        configured: true,
        botUsername: info.username,
        botFirstName: info.firstName,
      };
      return NextResponse.json(res);
    }
    // Token exists in storage but Telegram rejected it.
    const res: GetResponse = {
      configured: true,
      error: info.error || "token invalid",
    };
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load Telegram settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface PutBody {
  token?: unknown;
}

/**
 * PUT /api/settings/telegram  body: { token: string }
 *
 * Validates the token against Telegram before storing it. Invalid tokens are
 * never persisted. On success returns { ok, botUsername }.
 */
export async function PUT(req: NextRequest) {
  try {
    let body: PutBody;
    try {
      body = (await req.json()) as PutBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Bot token is required" }, { status: 400 });
    }
    // Telegram tokens are of the form "<digits>:<35 alphanumerics>".
    if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
      return NextResponse.json(
        { error: "Token looks malformed. Expected something like 123456789:ABC-DEF..." },
        { status: 400 }
      );
    }

    const info = await verifyBotToken(token);
    if (!info.ok) {
      return NextResponse.json(
        { error: info.error || "Telegram rejected this token" },
        { status: 400 }
      );
    }

    await setBotToken(token);
    return NextResponse.json({ ok: true, botUsername: info.username });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save Telegram token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/telegram
 *
 * Clears the stored bot token. Telegram send actions in automations are then
 * skipped silently.
 */
export async function DELETE() {
  try {
    await setBotToken("");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear Telegram token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
