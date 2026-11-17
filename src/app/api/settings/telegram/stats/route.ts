import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface StatsResponse {
  contactsWithTelegram: number;
  contactsConnected: number;
}

/**
 * GET /api/settings/telegram/stats
 *
 * Returns counts describing the workspace's Telegram reach:
 *  - contactsWithTelegram: subscribers who submitted a Telegram username
 *    (via a signup form) but may not have messaged the bot yet.
 *  - contactsConnected: subscribers who have started the bot (telegramChatId
 *    captured by the polling loop) and can therefore receive messages.
 */
export async function GET() {
  try {
    const [withTelegram, connected, empties] = await Promise.all([
      db.contact.count({
        where: { telegram: { not: null } },
      }),
      db.contact.count({
        where: { telegramChatId: { not: null } },
      }),
      db.contact.count({
        where: { telegram: "" },
      }),
    ]);
    // SQLite treats "" as non-null, so trim empty usernames out of the count.
    // (Contacts created before the field existed, or with an empty form value,
    // should not inflate the "has Telegram" number.)
    const res: StatsResponse = {
      contactsWithTelegram: Math.max(0, withTelegram - empties),
      contactsConnected: connected,
    };
    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load Telegram stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
