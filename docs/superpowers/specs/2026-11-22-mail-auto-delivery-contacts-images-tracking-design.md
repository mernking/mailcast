# MailCast: delivery, contacts, image uploads and tracking

Date: 2026-11-22

## Intent and why

The owner is testing the app as a real newsletter tool. Two test recipients were
used: one message landed in Gmail's Promotions tab and the other never arrived.
The app recorded both as successfully sent, so there was no way to tell what
actually happened. Alongside that, several everyday workflows are missing or
awkward: sending a new campaign requires saving it first, the add-contact form
cannot assign groups, CSV import is paste-only with guessed columns, email
images typed as `blob:` URLs break, and there is no open/click tracking.

The goal of this program is to make the app trustworthy to send from and
complete the contact-management and measurement basics. It is not a rewrite.

## Goals

1. One click on **Send broadcast** saves the current editor state and sends.
2. Delivery status reflects what SMTP actually accepted; rejections are visible.
3. Open and click events are recorded and shown per campaign.
4. Add-contact can assign one or more groups at creation time.
5. CSV import accepts an uploaded file and lets the user map each column.
6. Images can be uploaded in the editor and appear in sent mail; `data:`
   images in existing campaigns are hosted before send.

## Non-goals / anti-goals

- No change of mail provider. Gmail SMTP via nodemailer stays. Bounce/complaint
  webhooks and true "delivered" receipts therefore remain out of scope.
- No authentication layer, no background job queue, no rate limiting work.
- No dedicated tracking subdomain. Tracking lives on the same app origin.
- Do not claim open rate is precise. Apple Mail Privacy Protection and Gmail
  image proxying inflate it; the UI must say so.
- Do not silently mark a campaign `sent` when every recipient was rejected.

## Constraints found in the current code

- Next.js App Router, Prisma + SQLite, nodemailer (`src/lib/gmail.ts`), Zustand
  client state, no `middleware.ts` and no auth on any route.
- `POST /api/forms/[id]/submit` already exists and accepts JSON, url-encoded and
  multipart bodies; it creates the contact, submission, group membership and
  automation enrollment. "Extend the API so forms can be submitted through API"
  is treated as *harden and document this endpoint*, not build a new one.
- `Campaign.content` is a plain string (`html` or `markdown`). The HTML sanitizer
  preserves images and does not touch `blob:`/`data:` URLs.
- `sendCampaignEmail` only checks that `sendMail()` resolved — it ignores
  `info.accepted`, `info.rejected` and `info.pending`. Both test campaigns are
  recorded with `failedCount: 0` and null errors.
- `openedCount` exists in the schema but is never written. No event tables exist.
- Caddy listens on `:81` and reverse-proxies to `:3000`, forwarding
  `X-Forwarded-Proto`, `X-Forwarded-Host`/`Host`. There is no base-URL config.
- Deployment copies `public/` into the standalone output; the `upload/` directory
  is not deployed. Files written to disk at runtime would not survive a rebuild,
  so uploaded images must live in the database.

## Approaches considered and chosen

### Save + send
1. **Chosen.** Chain the existing endpoints in `handleSend`: POST `/api/campaigns`
   for new campaigns (or PATCH the existing draft), then POST the returned id to
   `/api/campaigns/[id]/send`. Smallest change, reuses tested code, no new route.
2. Add a `send: true` flag to the create route. One round-trip but mixes two
   responsibilities. Rejected.
3. New `/api/campaigns/quick-send` route. One clean call but duplicates save and
   send logic. Rejected.

### Delivery feedback
1. **Chosen.** Keep Gmail SMTP. Inspect `info.accepted/rejected/pending`, surface
   failures, add tracking, and host images externally instead of inlining
   base64. No new account, and it attacks the Promotions problem directly.
2. Move to Resend/SES with delivery webhooks. Real delivery/bounce/complaint
   events but needs a new account and credential migration. Deferred.

### Image storage
1. **Chosen.** Store bytes in a new `StoredFile` table and serve them through
   `/api/files/[id]`. Survives rebuilds; no filesystem dependency.
2. Write to `public/uploads/`. Simpler, but not deployed/persisted. Rejected.

### Tracking
1. **Chosen.** Own token + event tables and first-party `/t/[token]` endpoints.
2. Third-party analytics. Rejected: leaks recipient data and adds a dependency.

## Design

Work proceeds in the order below. Each phase is independently shippable.

### Phase 1 — save + send, and honest send results

`src/components/app/campaigns/campaign-editor.tsx`
- Extract the payload built in `handleSave` into `buildCampaignPayload()`.
- `handleSend` persists first (POST for `isNew`, PATCH otherwise), takes the
  returned `id`, updates the Zustand editor id, then calls
  `/api/campaigns/${id}/send`.
- Remove `isNew` from `sendDisabled`; keep sender/subject/content/recipients and
  in-flight checks. The helper text added earlier becomes "Fill in the required
  fields to enable sending" as a fallback.
- Toast on `result.ok` and `failedCount`, not always `toast.success`.

`src/lib/gmail.ts`
- Extend `SendResult` with `accepted`, `rejected`, `pending` arrays and keep
  `messageId`. Return `ok: false` when the recipient is in `rejected` or
  `pending`. Attach `transport.on("error", …)` logging.

`src/app/api/campaigns/[id]/send/route.ts`
- Mark a recipient `failed` when `result.ok` is false, recording the rejection.
- Final campaign status: `failed` when `sentCount === 0 && failedCount > 0`,
  otherwise `sent`. Never report success for zero delivered messages.
- Add server-side logging of per-recipient outcomes (currently none).

No schema change in this phase.

### Phase 2 — contacts and CSV import

`src/app/api/contacts/route.ts`
- Accept optional `groupIds: string[]`; after create/update, upsert
  `ContactGroupAssignment` rows (delete omitted ones on update). Keep the
  existing three fields working.

`src/components/app/contacts/contact-list.tsx`
- `AddContactDialog` fetches `/api/groups` and renders a group multi-select;
  sends `groupIds` with the contact.

`src/lib/contact-import.ts` (new) and `src/app/api/contacts/import/route.ts`
- Move the CSV parser into a shared pure module usable in browser and server.
- Extend the API to accept `{ contacts: [...] }` rows with
  `email, name, tags, telegram, groups` (group **names**; the server resolves
  them and creates missing groups), in addition to the current
  `{ csv }` / `{ emails }` shapes. Validate and upsert per row.
- Import **adds** group memberships and never removes existing ones, so a CSV
  cannot silently strip a contact out of other groups. (Deliberate difference
  from `POST /api/contacts`, which replaces the set it is given.)

`src/components/app/contacts/import-dialog.tsx`
- Add a file input; read the file with `File.text()`; detect the header row and
  preview the first rows.
- Render one mapping dropdown per CSV column: `email | name | tags | telegram |
  group | skip`, plus a default-group selector for rows without a group column.
- Submit mapped rows to `/api/contacts/import`.

### Phase 3 — image uploads (pulled forward: also fixes deliverability)

`prisma/schema.prisma` + migration
- `StoredFile { id, name, mimeType, size Int, data Bytes, createdAt }`.

`src/app/api/files/route.ts` (POST) and `src/app/api/files/[id]/route.ts` (GET)
- Accept `multipart/form-data` with a `file` field; allow png/jpeg/gif/webp,
  max 5 MB; return `{ id, url }`. GET streams bytes with the stored MIME type
  and `Cache-Control: public, max-age=31536000, immutable`.

`src/lib/public-url.ts` (new)
- `getPublicBaseUrl(req?)`: `process.env.APP_URL` when set, otherwise derive
  from forwarded headers (`x-forwarded-proto` + `x-forwarded-host`/`host`).
  The send route passes this into `sendCampaignEmail`; the editor uses relative
  URLs for storage. Document `APP_URL` in the env notes.

`src/components/app/campaigns/rich-text-editor.tsx`
- Replace the `window.prompt("Image URL")` flow with a file picker that uploads
  and inserts `<img src="/api/files/ID" alt="...">`.
- Intercept pasted and dropped image files and upload them the same way so no
  `blob:` URL ever reaches the content string.

`src/lib/email-template.ts` / `src/lib/gmail.ts`
- At send time, decode `data:image/...` sources in the rendered HTML, store the
  bytes through the file service, and rewrite to absolute public URLs. This
  repairs existing campaigns with large inline base64 images. Any remaining
  `blob:`/`data:` source is stripped rather than sent broken.
- Scope: **campaign broadcasts only.** `sendCampaignEmail` is also called from
  `src/lib/automation.ts`; the new context argument is optional and a no-op for
  automation sends, which keep today's behaviour.

### Phase 4 — open and click tracking

`prisma/schema.prisma` + migration
- `TrackingToken { token @unique, campaignId, recipientId, kind, url?, createdAt }`.
- `TrackingEvent { id, tokenId, campaignId, recipientId, kind, ip, userAgent, createdAt }`.
- `Campaign.trackOpens Boolean @default(false)`, `trackClicks Boolean @default(false)`,
  `clickedCount Int @default(0)`. The new-campaign editor defaults both toggles
  to on; update the landing FAQ copy to say tracking is on by default and can be
  disabled per campaign.

`src/lib/tracking.ts` (new)
- At send time, for each recipient create one open token and one click token per
  `<a href>` in the final HTML, rewriting hrefs to `${base}/api/t/${token}` and
  appending a 1×1 pixel to the HTML. Opaque cuid tokens only — no emails in URLs.
- Module boundary: add an optional `trackingContext` (campaignId, recipientId,
  baseUrl, flags) to `SendCampaignArgs`. `sendCampaignEmail` keeps ownership of
  merge + template rendering in `src/lib/email-template.ts` and calls
  `prepareTrackedHtml(html, context)` from `src/lib/tracking.ts` for the DB
  writes and rewrite. No `htmlOverride` path, no new DB dependencies in
  `gmail.ts` beyond that helper.

`src/app/api/t/[token]/route.ts` (GET)
- Log `{ kind, timestamp, IP, user-agent }`. Deduplicate opens per recipient per
  campaign (first only); clicks are logged on each hit.
- Clicks: 302 to the stored URL. Opens: 1×1 GIF with `image/gif` and
  `Cache-Control: no-store, no-cache, must-revalidate`.

`src/app/api/campaigns/[id]/stats/route.ts` and `StatsPanel`
- Expose `openedCount`, `clickedCount` and event counts; add Open/Click tiles.
- Add a short privacy note: "Opens can be inflated by privacy proxies; clicks
  are the reliable signal."

## What is left to the builder (my calls, check these)

- Form API: no new endpoint; harden/document `POST /api/forms/[id]/submit`
  (validate against the form's declared fields, keep CORS and current behaviour).
- Image size cap 5 MB and types png/jpeg/gif/webp.
- Tracking is per-campaign, default on for new campaigns, with the FAQ updated
  to match.
- Group assignment from CSV uses group names, creating missing groups on import;
  import adds memberships and never removes existing ones.
- Image hosting and tracking are campaign-only; automation sends keep their
  current behaviour.
- Tracking URLs are always `/api/t/[token]` (the same origin as the app).
- No migration of existing `data:`-heavy campaigns; Phase 3 rewrites them at send
  time instead.
