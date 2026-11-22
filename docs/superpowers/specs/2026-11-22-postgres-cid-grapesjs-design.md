# MailCast: Postgres, CID images, business template and GrapesJS editor

Date: 2026-11-22

## Intent and why

The owner wants images to travel inside the email as binary data rather than
being uploaded to and served from the app's server, wants a plain business
email template with a selectable font and no padding, wants a full GrapesJS
drag-and-drop email builder, and wants the database changed from SQLite to the
supplied Postgres/Supabase connection string.

These are four independent changes that touch the same send path, so they are
done in a fixed order and each phase leaves the app working.

## Goals

1. App runs on Postgres using the supplied Supabase pooler URL.
2. Existing SQLite data is copied into Postgres.
3. Email images are sent as MIME attachments referenced by `cid:`; no image
   file is stored by the app. The tracking pixel remains an external image URL.
4. Default email template uses Helvetica/Arial, no outer padding, and the font
   can be chosen per campaign.
5. A GrapesJS + MJML editor creates reusable email templates with blocks,
   traits, project/mjml/html storage, and its output can be used as a campaign
   body.

## Non-goals / anti-goals

- No auth, no rate limiting, no background send queue (unchanged).
- No new mail provider; still nodemailer over Gmail SMTP.
- No byte-for-byte preservation of the current stylized template look.
- No CDN or object storage for images.
- Do not claim CID solves Gmail's Promotions filtering — large images can
  still affect classification. The UI should keep emails reasonably small.

## Constraints found

- Prisma 6 with SQLite `provider = "sqlite"`; the supplied URL is Postgres.
  It works only without extra query parameters (`?pgbouncer=true` caused P1001).
- `.env` is a tracked file containing a local SQLite path. The Postgres URL
  must go in untracked `.env.local` for Next.js and be passed inline to Prisma
  CLI commands; never commit it.
- `src/lib/db.ts` pins a manual `PRISMA_CACHE_VERSION` key; it must be bumped
  after every Prisma client regeneration or the dev server keeps a stale client.
- `renderEmailHtml` in `src/lib/email-template.ts` wraps the body in 24px outer
  and 40px cell padding and uses an Apple-style font stack.
- `sendCampaignEmail` currently hosts `data:` images into `StoredFile` rows
  (Task 9). That path is being reversed.
- The editor uploads files to `/api/files`; that path is being replaced by a
  browser-side `FileReader` data URI so no file reaches the server.
- GrapesJS requires `window`/`document`; App Router forbids `ssr: false` in a
  Server Component, so a client wrapper plus `next/dynamic` is required.
- The project's AGENTS.md requires reading `node_modules/next/dist/docs/`
  before writing code; route handlers and dynamic imports docs are relevant.

## Approaches considered and chosen

### Database
1. **Chosen.** Switch Prisma provider to `postgresql`, generate a fresh initial
   migration, and copy the current SQLite rows into Postgres with a one-off
   script using Node's built-in `node:sqlite` reader and the generated Postgres
   Prisma client. Old SQLite migrations are removed from `prisma/migrations`
   (still recoverable from git history).
2. Keep SQLite and add a read-through Postgres cache. Rejected: two sources of
   truth.
3. `prisma db push` with no migrations. Rejected: no reproducible schema
   history.

### Images
1. **Chosen.** Keep image bytes as `data:` URIs inside `Campaign.content`; at
   send time convert each to a nodemailer `cid:` attachment. No server file
   storage. `blob:` sources are still stripped.
2. Base64 `data:` URI left in HTML. Rejected: frequently stripped/flagged by
   mail clients and is the likely cause of the earlier Promotions placement.
3. Keep `/api/files` hosting. Rejected by the owner.

### Template / font
1. **Chosen.** Extend `renderEmailHtml` with a `fontFamily` option and a small
   allowlist; default Helvetica/Arial; remove wrapper padding. Persist the
   choice as a campaign field with a select in the editor.
2. CSS variables with a remote font. Rejected: web fonts are unreliable in
   email clients.

### Editor
1. **Chosen.** `grapesjs` + `grapesjs-mjml`, client-only dynamic import,
   `/api/templates` CRUD storing `project`, `mjml` and `html`, plus a campaign
   "Use template" action that copies the compiled HTML into `content`.
2. `grapesjs-preset-newsletter` table-based preset. Rejected: MJML has better
   responsive email output and the guide is MJML-based.
3. Keep only the current rich-text editor. Rejected by the owner.

## Design

### Phase 1 — Postgres

- Write `.env.local` with `DATABASE_URL` (untracked). Prisma CLI commands get
  the URL inline via `DATABASE_URL=… npx prisma …`.
- Change `prisma/schema.prisma` provider to `postgresql`.
- Regenerate a single initial migration from the schema; remove the old
  SQLite migration directories and apply the new one to Supabase.
- Bump `PRISMA_CACHE_VERSION`.
- One-off migration script reads the SQLite file with `node:sqlite` and inserts
  every row into Postgres preserving ids and relations, in FK-safe order.
- Verify with `prisma db execute 'SELECT count(*) ...'` and the app's API routes.

### Phase 2 — template and font

- Add `fontFamily String @default("helvetica")` to `Campaign` (included in the
  new initial migration if Phase 1 has not been applied yet; otherwise a new
  migration).
- `renderEmailHtml(content, { fontFamily })` picks from an allowlist
  (`helvetica`, `arial`, `verdana`, `georgia`) and removes wrapper padding.
- API create/patch accept `fontFamily`; editor has a font select; payload
  carries it.

### Phase 3 — CID images

- New pure `src/lib/email-cid.ts`:
  `inlineImagesToAttachments(html): { html: string; attachments: Attachment[] }`
  converts `data:image/...` sources to `cid:` references and drops `blob:`.
- `sendCampaignEmail` uses it and passes `attachments` to `sendMail`.
- Editor image insertion uses `FileReader.readAsDataURL` and inserts the data
  URI directly; remove the `/api/files` upload call.
- Remove the `StoredFile` model and `/api/files` routes; remove image hosting
  from `gmail.ts`. Tracking pixel endpoint unchanged.

### Phase 4 — GrapesJS editor

- Add dependencies `grapesjs`, `grapesjs-mjml` (and their CSS).
- `EmailTemplate` Prisma model: `id, name, project, mjml?, html?, timestamps`.
- API: `GET/POST /api/templates`, `GET/PUT/DELETE /api/templates/[id]`.
- Client-only `EmailBuilder` component: device manager (desktop/375px),
  MJML plugin, block manager, traits, restricted style sector exposing
  font family/colour/alignment, project load/save and MJML→HTML export.
- Campaign editor gets a "Design" tab that mounts the builder; saving a
  template sets the campaign body to the compiled HTML (`contentType: html`).
- Generated HTML continues through merge tags, CID conversion and tracking.

## What is left to the builder (my calls, check these)

- Supabase URL goes in `.env.local`, never in git.
- Font allowlist is the four families listed above; default Helvetica.
- The GrapesJS editor reuses the existing campaign body rather than adding a
  separate "published design" concept.
- Existing SQLite data is copied once; no ongoing dual-write.
- The tracking pixel is the only externally loaded image in outgoing email.
