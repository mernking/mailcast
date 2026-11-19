import { db } from "./db";
import { encrypt, decrypt } from "./crypto";

/**
 * Telegram Bot API integration.
 *
 * Bots can only message users who have started the bot first (Telegram
 * requires an initial `/start`). So we collect a username via signup forms,
 * and the automation-runner mini-service long-polls `getUpdates` to capture
 * each user's numeric chat_id (matched by username). Once a chat_id is stored
 * on the contact, "Send Telegram" actions can deliver messages.
 *
 * The bot token is stored encrypted in the Setting table. If no token is
 * configured, all send attempts are skipped silently (no error).
 */

const TOKEN_KEY = "telegram_bot_token";

export function isTelegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

/** Read the encrypted bot token from the Setting table; "" if unset. */
export async function getBotToken(): Promise<string> {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;
  const row = await db.setting.findUnique({ where: { key: TOKEN_KEY } });
  if (!row?.value) return "";
  try {
    return decrypt(row.value);
  } catch {
    return "";
  }
}

/** Encrypt and persist the bot token. Pass "" to clear it. */
export async function setBotToken(token: string): Promise<void> {
  const clean = token.trim();
  if (!clean) {
    await db.setting.delete({ where: { key: TOKEN_KEY } }).catch(() => {});
    return;
  }
  const enc = encrypt(clean);
  await db.setting.upsert({
    where: { key: TOKEN_KEY },
    create: { key: TOKEN_KEY, value: enc },
    update: { value: enc },
  });
}

interface BotInfo {
  ok: boolean;
  username?: string;
  firstName?: string;
  error?: string;
}

/** Validate a token by calling /getMe. Returns the bot's username if valid. */
export async function verifyBotToken(token: string): Promise<BotInfo> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as {
      ok: boolean;
      result?: { username?: string; first_name?: string };
      description?: string;
    };
    if (data.ok && data.result) {
      return {
        ok: true,
        username: data.result.username,
        firstName: data.result.first_name,
      };
    }
    return { ok: false, error: data.description || "Invalid token" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export interface SendTelegramResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
}

/** Send a text message to a contact's Telegram chat. Skips if no token/chatId. */
export async function sendTelegramMessage(
  chatId: string | null | undefined,
  text: string
): Promise<SendTelegramResult> {
  if (!chatId) {
    return { ok: false, skipped: true, error: "No Telegram chat id" };
  }
  const token = await getBotToken();
  if (!token) {
    // No bot configured — skip silently rather than failing the workflow.
    return { ok: false, skipped: true, error: "Telegram bot not configured" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      return { ok: false, error: data.description || "Telegram API error" };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { username?: string; first_name?: string };
    text?: string;
  };
}

let lastUpdateOffset = 0;

/**
 * Long-poll Telegram getUpdates once. For each incoming message, match the
 * sender's username against contacts with a `telegram` username and store
 * their chat_id. Returns the number of contacts updated.
 *
 * Called in a loop by the automation-runner mini-service. When no token is
 * configured, this is a no-op.
 */
export async function pollTelegramUpdates(): Promise<number> {
  const token = await getBotToken();
  if (!token) return 0;

  try {
    const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
    url.searchParams.set("timeout", "25");
    url.searchParams.set("offset", String(lastUpdateOffset + 1));
    url.searchParams.set("allowed_updates", JSON.stringify(["message"]));

    const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
    const data = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };
    if (!data.ok || !data.result) return 0;

    let updated = 0;
    for (const update of data.result) {
      if (update.update_id > lastUpdateOffset) {
        lastUpdateOffset = update.update_id;
      }
      const msg = update.message;
      if (!msg?.from?.username || !msg.chat?.id) continue;

      const username = msg.from.username.replace(/^@/, "").toLowerCase();
      // Match any contact whose stored telegram username equals this one.
      const contacts = await db.contact.findMany({
        where: { telegram: username },
        select: { id: true },
      });
      for (const c of contacts) {
        await db.contact
          .update({
            where: { id: c.id },
            data: { telegramChatId: String(msg.chat.id) },
          })
          .catch(() => {});
        updated++;
      }
    }
    return updated;
  } catch {
    // Network timeout / abort — expected with long-polling. Not an error.
    return 0;
  }
}
