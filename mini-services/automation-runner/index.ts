import { db } from "../../src/lib/db";
import { processDueEnrollments } from "../../src/lib/automation";
import { pollTelegramUpdates } from "../../src/lib/telegram";

const PORT = 3030;
const POLL_MS = 60_000;

async function tick() {
  try {
    const n = await processDueEnrollments(100);
    if (n > 0) console.log(`[automation-runner] processed ${n} enrollment(s)`);
  } catch (err) {
    console.error("[automation-runner] tick error:", err);
  }
}

// Process once on startup, then on an interval.
tick();
setInterval(tick, POLL_MS);

/**
 * Telegram long-poll loop. Runs continuously alongside the automation tick.
 * When a bot token is configured (in the Setting table), this captures
 * incoming messages and stores each sender's chat_id against matching
 * contacts (by username). No-op when no token is set.
 */
async function telegramLoop() {
  let running = true;
  while (running) {
    try {
      const updated = await pollTelegramUpdates();
      if (updated > 0) {
        console.log(`[automation-runner] telegram: matched ${updated} chat id(s)`);
      }
    } catch (err) {
      console.error("[automation-runner] telegram poll error:", err);
      // Back off briefly before retrying on unexpected errors.
      await Bun.sleep(5000);
    }
  }
}
// Fire and forget — runs forever alongside the server.
telegramLoop();

// Tiny health endpoint (the gateway requires a port).
const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "mailcast-automation-runner",
        telegram: "polling",
      });
    }
    return new Response("mailcast automation runner", { status: 200 });
  },
});

// Keep a reference so TS doesn't complain about an unused binding.
void server;

console.log(
  `[automation-runner] listening on :${PORT}, automation poll every ${POLL_MS / 1000}s + telegram long-poll`
);
