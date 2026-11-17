import { db } from "../../src/lib/db";
import { processDueEnrollments } from "../../src/lib/automation";

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

// Tiny health endpoint (the gateway requires a port).
const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "mailcast-automation-runner" });
    }
    return new Response("mailcast automation runner", { status: 200 });
  },
});

// Keep a reference so TS doesn't complain about an unused binding.
void server;

console.log(
  `[automation-runner] listening on :${PORT}, polling every ${POLL_MS / 1000}s`
);
