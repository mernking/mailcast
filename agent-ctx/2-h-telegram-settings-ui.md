# Task 2-h — Telegram settings UI

## Files created
- `src/app/api/settings/telegram/route.ts` — `GET` / `PUT` / `DELETE` for the bot token.
  - `GET` reads `getBotToken()`; if empty → `{ configured: false }`. If a token
    exists, calls `verifyBotToken` to fetch the bot's `@username`. If Telegram
    rejects it (revoked / rotated), returns `{ configured: true, error }` so the
    UI can show an "invalid token" badge and let the user disconnect / reconnect.
  - `PUT { token }` validates the token format with a regex
    (`/^\d+:[A-Za-z0-9_-]{20,}$/`) before calling `verifyBotToken`. Invalid
    tokens are **never stored**. On success: `setBotToken(token)` + returns
    `{ ok, botUsername }`.
  - `DELETE` calls `setBotToken("")` (clears the encrypted record). Returns
    `{ ok }`.
  - `export const dynamic = "force-dynamic"` so Next never caches the response.
- `src/app/api/settings/telegram/stats/route.ts` — `GET` returns
  `{ contactsWithTelegram, contactsConnected }`. The first count subtracts
  contacts whose `telegram` is `""` (SQLite treats empty strings as non-null,
  so we trim them out). Uses `Promise.all` of three `db.contact.count` calls.

## Files modified
- `src/components/app/settings.tsx` — added a `TelegramCard` component and
  rendered it at the top of the Settings list (above the Gmail sender card).
  All existing cards (Gmail sender summary, sending limits, privacy & security,
  danger zone) are preserved unchanged. New imports: `Send`, `Eye`, `EyeOff`,
  `ExternalLink`, `CheckCircle2`, `Info`, `Unplug` from lucide-react; plus
  `Input`, `Label`, `Badge`, `Separator`, `Alert`, `AlertDescription`,
  `AlertTitle` from shadcn/ui.
  - **Unconfigured state**: password-style input with show/hide toggle
    (`Eye`/`EyeOff`), `Connect bot` button → `PUT /api/settings/telegram`.
    On success toasts `Bot @username connected`. On error toasts the message
    (e.g. `Unauthorized`). Below: an ordered-list Alert with the BotFather
    steps, plus an "Open @BotFather" external link to `https://t.me/BotFather`
    (target=_blank, rel=noreferrer). Footer note about silent skipping.
  - **Configured state**: green-emerald `Connected` badge with the bot's
    `@username` (links to `https://t.me/<bot>`). Stats grid (two tiles) showing
    "contacts shared a Telegram username" and "have started the bot" — fetched
    from `/api/settings/telegram/stats`. A `Disconnect` button opens an
    `AlertDialog` requiring confirmation before calling `DELETE`. Help Alert
    explaining the `/start` requirement and that signup-form usernames are
    matched automatically by the polling loop.
  - **Invalid-token state**: when GET returns `{ configured: true, error }`,
    shows a destructive `Token invalid` badge + Alert with the Telegram error,
    while still offering Disconnect / reconnect.

## Curl smoke tests (all run, all green)

```
# GET status — no token stored
curl -s http://localhost:3000/api/settings/telegram
=> {"configured":false}   [HTTP 200]

# PUT malformed-format token
curl -s -X PUT http://localhost:3000/api/settings/telegram -H 'Content-Type: application/json' -d '{"token":"123:fake"}'
=> {"error":"Token looks malformed. Expected something like 123456789:ABC-DEF..."}   [HTTP 400]

# PUT format-valid but Telegram-rejected token
curl -s -X PUT http://localhost:3000/api/settings/telegram -H 'Content-Type: application/json' -d '{"token":"123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"}'
=> {"error":"Unauthorized"}   [HTTP 400]

# GET after invalid PUTs — confirmed invalid tokens were NOT stored
curl -s http://localhost:3000/api/settings/telegram
=> {"configured":false}   [HTTP 200]

# GET stats
curl -s http://localhost:3000/api/settings/telegram/stats
=> {"contactsWithTelegram":0,"contactsConnected":0}   [HTTP 200]

# DELETE (idempotent no-op when nothing stored)
curl -s -X DELETE http://localhost:3000/api/settings/telegram
=> {"ok":true}   [HTTP 200]

# PUT malformed JSON
curl -s -X PUT http://localhost:3000/api/settings/telegram -H 'Content-Type: application/json' -d 'not-json'
=> {"error":"Invalid JSON body"}   [HTTP 400]

# PUT empty token
curl -s -X PUT http://localhost:3000/api/settings/telegram -H 'Content-Type: application/json' -d '{"token":""}'
=> {"error":"Bot token is required"}   [HTTP 400]
```

No real bot tokens were stored during testing. After all curl runs, the
workspace is left unconfigured (`GET` returns `{ configured: false }`).

## Lint / build
- `bun run lint` → passes with zero errors.
- Did NOT run `bun run build` per instructions.
- Dev server on :3000 was left running throughout; only the new API routes
  were added (no other routes modified).

## Dev.log
Most recent lines show `PUT /api/settings/telegram 400` (for the format-valid
but rejected token — the 2.5s render time is the Telegram getMe round-trip),
`GET /api/settings/telegram 200`, `GET /api/settings/telegram/stats 200`, and
`DELETE /api/settings/telegram 200`. No errors / no stack traces.

## Notes / decisions
- Chose `Send` (paper plane) as the card icon — fits the MailCast "delivery"
  theme and avoids blue. For the success badge I used a muted emerald
  (`bg-emerald-500/10 text-emerald-700 border-emerald-500/30`) — minimal green
  for success only, as the palette allows.
- Pre-validation regex on PUT means a malformed token never even hits Telegram
  (saves a network round-trip and keeps the error message friendly).
- Stats endpoint subtracts empty-string `telegram` values because SQLite
  stores them as non-null. This keeps the "shared a Telegram username" count
  honest when a contact was created before the field existed or submitted an
  empty form value.
- The connected view links the `@botUsername` to `https://t.me/<username>` so
  the user can jump straight into a chat with their own bot to verify it.
