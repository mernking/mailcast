# MailCast Delivery, Contacts, Images and Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make campaign sending honest and reliable, complete contact/CSV/group workflows, host images so they work in email, and record open/click events.

**Architecture:** Keep the existing Next.js App Router + Prisma/SQLite + nodemailer Gmail SMTP stack. Add small pure helper modules that can be unit-tested with Node's built-in test runner, then wire them into the existing routes and the campaign editor. New DB models are added by migrations; no provider or auth changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6 + SQLite, nodemailer 10, `@radix-ui/*` / shadcn UI, Node 26 built-in `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-22-mail-auto-delivery-contacts-images-tracking-design.md`

## Global Constraints

- Keep Gmail SMTP via nodemailer. No new mail provider, no bounce webhooks, no auth, no job queue.
- Tracking URLs are always `${baseUrl}/api/t/${token}` on the app's own origin; no tracking subdomain.
- Base URL is `process.env.APP_URL` when set, otherwise derived from `x-forwarded-proto` and `x-forwarded-host`/`host`.
- Uploaded images: png/jpeg/gif/webp only, max 5 MB, stored as `Bytes` in SQLite and served from `/api/files/[id]`.
- CSV import **adds** group memberships and never removes existing ones.
- Opens are deduplicated per recipient per campaign; clicks are logged on every hit.
- Tests use `node --test tests/unit` with no new dev dependency. Tested helper modules must not use extensionless relative imports; tests import `.ts` files with explicit extensions.
- Verification: `npx tsc --noEmit --incremental false` and `npx eslint <changed files>`. Pre-existing errors in `examples/`, `mini-services/`, `src/components/app/automations/`, `src/components/app/forms/types.ts`, `src/components/landing/stats-bar.tsx` are out of scope; no new errors in touched files.

## Review Focus

1. SMTP accepts the connection but rejects a recipient — the app must record that recipient as `failed`, and must not report the campaign as sent when nobody was delivered (Task 1).
2. Sending a new or edited campaign must persist the current editor state first, not send stale DB content (Task 2).
3. A CSV row with a quoted comma in the name, a mapped group column and a duplicate email must parse, map and dedupe correctly (Task 4).
4. An old campaign containing `data:image/...` must be sent with absolute hosted image URLs, and `blob:` sources must never reach the outgoing email (Task 9).
5. An open pixel must be counted once per recipient, and a tracked click must 302 to the original URL (Task 12).

---

## Phase 1 — honest sending and one-click save+send

### Task 1: SMTP result classification and real failure status

**Files:**
- Create: `src/lib/send-result.ts`
- Modify: `src/lib/gmail.ts:40-111,114-134`
- Modify: `src/app/api/campaigns/[id]/send/route.ts:123-177`
- Modify: `src/components/app/campaigns/campaign-editor.tsx:373-399`
- Modify: `package.json` (add `"test": "node --test tests/unit"`)
- Test: `tests/unit/send-result.test.ts`

**Interfaces:**
- Consumes: nodemailer `sendMail()` result (`messageId`, `accepted`, `rejected`, `pending`).
- Produces: `classifySendResult(info: SmtpInfo): SendClassification` where `SendClassification = { ok: boolean; accepted: string[]; rejected: string[]; pending: string[]; messageId?: string; error?: string }`. `SendResult` in `gmail.ts` extends this with no extra required fields.

- [ ] **Step 1: Write failing tests for classification** in `tests/unit/send-result.test.ts`: all accepted → `ok:true` and addresses preserved; one rejected → `ok:false` with the address in `error`; pending-only → `ok:false`; empty accepted/rejected/pending → `ok:false`.

- [ ] **Step 2: Run `node --test tests/unit/send-result.test.ts`; expect failure** because the module is missing.

- [ ] **Step 3: Implement `classifySendResult` in `src/lib/send-result.ts`.** Normalize `accepted`/`rejected`/`pending` (which may contain address strings or objects) to `string[]`. Never return `ok:true` without at least one accepted address.

- [ ] **Step 4: Run the test; expect PASS.**

- [ ] **Step 5: Wire into `gmail.ts`** — extend `SendResult`, return the classification from `sendCampaignEmail` and `sendTestEmail`, and add `transport.on("error", …)` logging inside `getTransport`. Keep auth-error cache eviction.

- [ ] **Step 6: Wire into the send route** — a recipient is `failed` when `result.ok === false`; final campaign status is `failed` when `sentCount === 0 && failedCount > 0`, otherwise `sent`. Log each outcome server-side.

- [ ] **Step 7: Fix the client toast** — use `toast.error` when `!result.ok || result.failedCount > 0`, with the count and `result.error`/`warning` as description.

- [ ] **Step 8: Verify** — `node --test tests/unit`, then `npx tsc --noEmit --incremental false` and `npx eslint` on the four changed source files. Commit.

### Task 2: Save then send from one click

**Files:**
- Modify: `src/components/app/campaigns/campaign-editor.tsx:333-399,448-476`

**Interfaces:**
- Consumes: `buildCampaignPayload()` returning the JSON body already used by `handleSave` (`title, subject, preheader, content, contentType, senderId, targetGroupId`).
- Produces: `handleSend` persists via `POST /api/campaigns` (new) or `PATCH /api/campaigns/${campaignId}` (existing), then calls `POST /api/campaigns/${id}/send` with the returned id and calls `openCampaignEditor(id)` for new campaigns.

- [ ] **Step 1: Extract `buildCampaignPayload()`** from `handleSave` without changing its behaviour; `handleSave` uses it.

- [ ] **Step 2: Change `handleSend`** to persist first, use the returned `id` for the send call, and remove the `isNew` early return. Keep the confirmation dialog.

- [ ] **Step 3: Remove `isNew` from `sendDisabled`** and make `sendDisabledReason` cover only the remaining conditions.

- [ ] **Step 4: Verify** — `npx tsc --noEmit --incremental false`, `npx eslint` on the file, then smoke-test in the running app: create a new campaign, fill it, click *Send broadcast* once, and confirm in the DB that a campaign row and recipient rows exist and the send route was hit. Commit.

---

## Phase 2 — contacts and CSV import

### Task 3: Group assignment on add-contact

**Files:**
- Modify: `src/app/api/contacts/route.ts:65-119`
- Modify: `src/components/app/contacts/contact-list.tsx:786-882`

**Interfaces:**
- Consumes: optional `groupIds?: string[]` in the contact POST body; existing group list from `GET /api/groups`.
- Produces: contact upsert that replaces memberships with the supplied set (delete omitted ones on update), inside a transaction.

- [ ] **Step 1: Add `groupIds` handling to `POST /api/contacts`** — validate ids exist, then upsert/delete `ContactGroupAssignment` rows for the contact.

- [ ] **Step 2: Add a group multi-select to `AddContactDialog`** using the existing Radix `Select`/checkbox patterns, fetching `/api/groups`, and include `groupIds` in the POST body.

- [ ] **Step 3: Verify** — `npx tsc ...`, `npx eslint ...`, then via API: create a contact with a group id and confirm the assignment row exists; update it with an empty list and confirm the row is gone. Commit.

### Task 4: Shared CSV parser and column mapper

**Files:**
- Create: `src/lib/contact-import.ts`
- Test: `tests/unit/contact-import.test.ts`

**Interfaces:**
- Produces:
  - `parseCsv(text: string): { headers: string[]; rows: string[][] }` — quote-aware, header-row detection.
  - `mapCsvRows(headers: string[], rows: string[][], mapping: Record<string, ColumnMapping>, defaultGroups: string[]): { contacts: MappedContact[]; skipped: number }`
  - `ColumnMapping = "email" | "name" | "tags" | "telegram" | "group" | "skip"`.
  - `MappedContact = { email: string; name: string | null; tags: string; telegram: string | null; groups: string[] }`.

- [ ] **Step 1: Write failing tests** covering: quoted comma in a name field; header detected from `email`; mapping `name/email/tags/group`; comma-separated group names; invalid email skipped; duplicate email skipped with `skipped` incremented.

- [ ] **Step 2: Run the test; expect failure** because the module is missing.

- [ ] **Step 3: Implement `parseCsv` and `mapCsvRows`** in the standalone module (no extensionless imports). Case-insensitive email regex matching the API's current `EMAIL_RE`.

- [ ] **Step 4: Run the test; expect PASS.** Commit.

### Task 5: Import API accepts mapped rows with group names

**Files:**
- Modify: `src/app/api/contacts/import/route.ts:105-187`

**Interfaces:**
- Consumes: `{ contacts: MappedContact[] }` from Task 4 alongside the existing `{ csv }` / `{ emails }` shapes.
- Produces: `{ imported, updated, skipped, total }`; resolves group names to ids, creating missing `ContactGroup` rows, and **adds** memberships via `upsert` without deleting existing ones.

- [ ] **Step 1: Add the `{ contacts }` branch** to the POST body parser and validate each row with the same email regex.

- [ ] **Step 2: Add group resolution** — case-insensitive name lookup, create missing groups with a default colour, then `contactGroupAssignment.upsert` for each membership.

- [ ] **Step 3: Add a unit test** in `tests/unit/contact-import.test.ts` for a pure helper `mergeGroups(existing: string[], incoming: string[]): string[]` that returns the union case-insensitively; use it in the API.

- [ ] **Step 4: Verify** — `node --test tests/unit`, `npx tsc ...`, then POST a mapped row with a new group name and confirm both contact and group assignment were created and an existing membership survived. Commit.

### Task 6: CSV file upload and column-mapping UI

**Files:**
- Modify: `src/components/app/contacts/import-dialog.tsx:36-140`

**Interfaces:**
- Consumes: `parseCsv`, `mapCsvRows`, `MappedContact` from Task 4.
- Produces: a three-step dialog — upload/preview, map columns, submit `{ contacts }`.

- [ ] **Step 1: Add a file input** (`accept=".csv,text/csv"`) that reads with `File.text()` and calls `parseCsv`; store headers and the first 5 rows for preview. Keep the existing paste tabs working.

- [ ] **Step 2: Render one mapping select per column** with the six `ColumnMapping` options, defaulting by header name (email/name/tags/telegram/group), plus a default-group text field.

- [ ] **Step 3: On submit, call `mapCsvRows` and POST the resulting `contacts`** to `/api/contacts/import`; keep the current success toast.

- [ ] **Step 4: Verify** — `npx tsc ...`, `npx eslint ...`, then upload a small CSV in the app, map a column to group, and confirm the contacts and group memberships. Commit.

### Task 6b: Harden and document the public form-submission API

**Files:**
- Create: `src/lib/form-submission.ts`
- Modify: `src/app/api/forms/[id]/submit/route.ts:92-133`
- Create: `docs/api/form-submission.md`
- Test: `tests/unit/form-submission.test.ts`

**Interfaces:**
- Produces: `validateSubmission(values: Record<string,string>, requiredKeys: string[]): { ok: boolean; missing: string[] }`; unchanged response `{ ok, message }` from the endpoint.

- [ ] **Step 1: Write failing tests** for `validateSubmission`: missing required key reported; all present → ok; extra keys ignored.

- [ ] **Step 2: Implement `validateSubmission`** in a standalone module; run tests to PASS.

- [ ] **Step 3: Call it in the submit route** against the form's declared required fields, returning `{ ok:false, error }` with the missing names. Preserve CORS, multipart/url-encoded/JSON parsing and the current side effects.

- [ ] **Step 4: Write `docs/api/form-submission.md`** with the endpoint, accepted content types, field names, response shape and one `curl` example for JSON and one for HTML form data.

- [ ] **Step 5: Verify** — `node --test tests/unit`, `npx tsc ...`, then POST a valid and an invalid submission to a form and check both responses. Commit.

---

## Phase 3 — image uploads

### Task 7: StoredFile model, migration and file endpoints

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_stored_files/migration.sql`
- Create: `src/app/api/files/route.ts`
- Create: `src/app/api/files/[id]/route.ts`
- Create: `src/lib/file-types.ts`
- Test: `tests/unit/file-types.test.ts`

**Interfaces:**
- Produces: `StoredFile { id, name, mimeType, size, data Bytes, createdAt }`; `isAllowedImage(mimeType: string, size: number): boolean`; `POST /api/files` → `{ id, url: "/api/files/ID" }`; `GET /api/files/[id]` → bytes with stored MIME type and immutable cache headers.

- [ ] **Step 1: Add the `StoredFile` model** and generate/apply the migration with `npx prisma migrate dev --name stored_files`.

- [ ] **Step 2: Write failing tests** for `isAllowedImage`: valid png under 5 MB true; 5 MB+1 false; gif/webp/jpeg true; `application/pdf` false.

- [ ] **Step 3: Implement `isAllowedImage`** in the standalone `src/lib/file-types.ts`; run tests to PASS.

- [ ] **Step 4: Implement the POST route** — multipart `file`, validate with `isAllowedImage`, store `Buffer` bytes, return id and relative URL. Implement the GET route with `Content-Type`, `Content-Length` and `Cache-Control: public, max-age=31536000, immutable`.

- [ ] **Step 5: Verify** — `node --test tests/unit`, `npx tsc ...`, then curl a small PNG upload and fetch it back. Commit.

### Task 8: Public base URL and editor image upload

**Files:**
- Create: `src/lib/public-url.ts`
- Modify: `src/components/app/campaigns/rich-text-editor.tsx:105-122`
- Test: `tests/unit/public-url.test.ts`

**Interfaces:**
- Consumes: request `Headers` from the send route.
- Produces: `getPublicBaseUrl(headers: Headers): string` — `APP_URL` (trim trailing `/`) else `${proto}://${host}`, no trailing slash; `uploadImage(file: File): Promise<string>` in the editor returning `/api/files/ID`.

- [ ] **Step 1: Write failing tests** for `getPublicBaseUrl`: `APP_URL` wins with trailing slash removed; forwarded proto/host used; `host` fallback; empty headers return `""`.

- [ ] **Step 2: Implement `getPublicBaseUrl`** in the standalone module; run tests to PASS.

- [ ] **Step 3: Replace the image URL prompt** in the editor with a file picker that POSTs to `/api/files` and inserts `<img src="/api/files/ID" alt="...">`. Add paste and drop handlers for image files that use the same upload path.

- [ ] **Step 4: Document `APP_URL`** in the env notes and pass `getPublicBaseUrl(req.headers)` from the send route into `sendCampaignEmail`.

- [ ] **Step 5: Verify** — `node --test tests/unit`, `npx tsc ...`, `npx eslint ...`. Commit.

### Task 9: Host inline images before sending

**Files:**
- Create: `src/lib/email-media.ts`
- Modify: `src/lib/gmail.ts:61-101`
- Modify: `src/app/api/campaigns/[id]/send/route.ts`
- Test: `tests/unit/email-media.test.ts`

**Interfaces:**
- Consumes: rendered HTML; optional `context: SendContext` on `SendCampaignArgs`, where `SendContext = { baseUrl: string; campaignId?: string; recipientId?: string; trackOpens?: boolean; trackClicks?: boolean }`. Campaign sends pass every field; automation sends pass none.
- Produces: `hostInlineImages(html: string, opts: { host: (bytes: Buffer, mimeType: string) => Promise<string> }): Promise<string>` — replaces `data:image/...` sources with hosted absolute URLs and removes `blob:`/`data:` sources that cannot be hosted.

- [ ] **Step 1: Write failing tests** — a `data:image/png;base64,...` src is replaced by the URL returned from the injected `host`; a `blob:` src attribute is removed; a normal `https://` image is untouched.

- [ ] **Step 2: Run tests; expect failure** because the module is missing.

- [ ] **Step 3: Implement `hostInlineImages`**, including `Buffer.from(base64, "base64")`. Run tests to PASS.

- [ ] **Step 4: Wire into `sendCampaignEmail`** — when `args.context?.baseUrl` is present, store decoded data-URI bytes via `db.storedFile.create` and rewrite to `${baseUrl}/api/files/ID`; leave automation sends (no context) unchanged.

- [ ] **Step 5: Verify** — `node --test tests/unit`, `npx tsc ...`, then send a campaign whose content contains a small `data:image/png` URI and inspect the delivered HTML (or the transport capture in a local test) for the hosted URL. Commit.

---

## Phase 4 — tracking

### Task 10: Tracking schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_tracking/migration.sql`

**Interfaces:**
- Produces: `TrackingToken { token @unique, campaignId, recipientId, kind ("open"|"click"), url?, createdAt }`, `TrackingEvent { id, tokenId, campaignId, recipientId, kind, ip, userAgent, createdAt }`, and `Campaign.trackOpens`, `trackClicks` (Boolean, default false), `clickedCount` (Int, default 0).

- [ ] **Step 1: Add the models and fields** with indexes on `token` (unique), `(campaignId, kind)` and `(recipientId, campaignId, kind)`.

- [ ] **Step 2: Generate and apply the migration** with `npx prisma migrate dev --name tracking`.

- [ ] **Step 3: Verify** — `npx prisma validate` and `npx tsc ...`. Commit.

### Task 11: Tracking HTML rewrite helper

**Files:**
- Create: `src/lib/tracking-html.ts`
- Test: `tests/unit/tracking-html.test.ts`

**Interfaces:**
- Produces: `buildTrackedHtml(html: string, opts: { baseUrl: string; openToken: string; tokenForUrl(url: string): string }): string`.

- [ ] **Step 1: Write failing tests** — `href="https://example.com/a?x=1"` is rewritten to `${baseUrl}/api/t/T1`; the original URL is passed to `tokenForUrl`; a 1×1 `<img>` with the open token is appended; `mailto:` hrefs are left alone.

- [ ] **Step 2: Run tests; expect failure** because the module is missing.

- [ ] **Step 3: Implement `buildTrackedHtml`** as a standalone pure module. Run tests to PASS. Commit.

### Task 12: Token creation, tracking endpoint and stats

**Files:**
- Create: `src/lib/tracking.ts`
- Create: `src/app/api/t/[token]/route.ts`
- Modify: `src/lib/gmail.ts:61-101`
- Modify: `src/app/api/campaigns/[id]/send/route.ts`
- Modify: `src/app/api/campaigns/[id]/stats/route.ts`
- Modify: `src/app/api/campaigns/route.ts`, `src/app/api/campaigns/[id]/route.ts`
- Test: `tests/unit/tracking-dedupe.test.ts`

**Interfaces:**
- Consumes: `buildTrackedHtml` (Task 11) and `context` from Task 9 extended with `campaignId, recipientId, trackOpens, trackClicks`.
- Produces: `prepareTrackedHtml(html, context): Promise<string>` creating tokens and rewriting HTML; `GET /api/t/[token]` logging an event and returning a 302 (click) or 1×1 GIF (open); `hasOpenEvent(events, recipientId, campaignId): boolean` pure dedupe helper.

- [ ] **Step 1: Write a failing test for `hasOpenEvent`** — returns true only when an open event for the same recipient and campaign exists.

- [ ] **Step 2: Implement `hasOpenEvent`** in `tests`-reachable standalone code inside `src/lib/tracking.ts` (keep the DB-backed `prepareTrackedHtml` in a separate module `src/lib/tracking-store.ts` so the tested module has no imports). Run tests to PASS.

- [ ] **Step 3: Implement `prepareTrackedHtml`** in `src/lib/tracking-store.ts`: create one open token and one click token per non-`mailto:` href, then call `buildTrackedHtml`.

- [ ] **Step 4: Call it from `sendCampaignEmail`** when `context.trackOpens || context.trackClicks`, after `hostInlineImages`. Pass the full context from the send route, reading the campaign's tracking flags.

- [ ] **Step 5: Append UTM parameters** to the stored click destination when creating the token: `utm_source=mailcast`, `utm_medium=email`, `utm_campaign=<campaignId>`, preserving any existing query parameters.

- [ ] **Step 6: Implement `GET /api/t/[token]`** — look up token, dedupe opens with `hasOpenEvent`, create `TrackingEvent`, increment `Campaign.openedCount`/`clickedCount`, then return 302 to `token.url` for clicks or a 1×1 `image/gif` with `no-store` for opens. Unknown token → 404.

- [ ] **Step 7: Extend the stats route** to return `openedCount`, `clickedCount`, and event counts; accept and persist `trackOpens`/`trackClicks` in the campaign create and PATCH routes.

- [ ] **Step 8: Verify** — `node --test tests/unit`, `npx tsc ...`, then send a tracked campaign and curl the open URL twice (one event) and a click URL (302 to the original). Commit.

### Task 13: Tracking UI

**Files:**
- Modify: `src/components/app/campaigns/campaign-editor.tsx` (new-campaign defaults, toggles, stats tiles)
- Modify: `src/components/landing/faq.tsx:29-30`

**Interfaces:**
- Consumes: `trackOpens`, `trackClicks`, `openedCount`, `clickedCount` in `CampaignDetail` and `CampaignStats`; existing `Switch` component.

- [ ] **Step 1: Add two `Switch` controls** to the campaign header section for open and click tracking, defaulting on for new campaigns and bound to the payload from Task 2.

- [ ] **Step 2: Add Open and Click tiles** to `StatsPanel` next to Sent/Failed/Pending, plus the privacy note: "Opens can be inflated by privacy proxies; clicks are the reliable signal."

- [ ] **Step 3: Update the FAQ answer** to say tracking is on by default and can be disabled per campaign.

- [ ] **Step 4: Verify** — `npx tsc ...`, `npx eslint ...`, then check the editor renders both toggles and the stats panel shows the new tiles. Commit.

---

## Final verification

- [ ] Run `npm test`, `npx tsc --noEmit --incremental false`, `npx eslint .` and record that no new errors were introduced.
- [ ] End-to-end smoke against a running dev server on `:3000`, substituting real ids from the DB:

```bash
curl -s -F "file=@/tmp/opencode/smoke.png" http://localhost:3000/api/files
curl -s http://localhost:3000/api/files/<FILE_ID> -o /tmp/opencode/roundtrip.png
curl -s -X POST http://localhost:3000/api/contacts \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","name":"Smoke","groupIds":["<GROUP_ID>"]}'
curl -s -X POST http://localhost:3000/api/campaigns \
  -H 'Content-Type: application/json' \
  -d '{"title":"Smoke","subject":"Smoke","content":"<p>Hi <a href=\"https://example.com\">there</a></p>","contentType":"html","senderId":"<SENDER_ID>","trackOpens":true,"trackClicks":true}'
curl -s -X POST http://localhost:3000/api/campaigns/<CAMPAIGN_ID>/send
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/t/<OPEN_TOKEN>
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/api/t/<CLICK_TOKEN>
curl -s http://localhost:3000/api/campaigns/<CAMPAIGN_ID>/stats
```

- [ ] Confirm the DB rows: a `StoredFile`, a contact with a group assignment, campaign recipient rows, and one open event after two pixel hits plus a click event with the original URL.
- [ ] Review the whole branch with a fresh reviewer before merging.
