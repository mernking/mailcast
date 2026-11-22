# Postgres, CID Images and GrapesJS Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move MailCast to Postgres, send images as CID attachments instead of server-hosted files, give the email template a business font with no padding, and add a GrapesJS/MJML template editor.

**Architecture:** Keep the Next.js App Router + Prisma + nodemailer stack. Phase 1 replaces the datasource; Phases 2–3 change the HTML/attachment pipeline through pure helpers; Phase 4 adds an EmailTemplate model, a templates API, and a client-only GrapesJS wrapper whose compiled HTML is copied into a campaign body.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6 (postgresql), Supabase pooler, nodemailer 10, grapesjs + grapesjs-mjml, Node 26 `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-22-postgres-cid-grapesjs-design.md`

## Global Constraints

- The Postgres URL goes in untracked `.env.local`. Pass it inline to Prisma CLI as `DATABASE_URL=… npx prisma …`. Never commit it.
- The supplied pooler URL works **without** query parameters; `?pgbouncer=true` gives P1001.
- `.env` is tracked and still holds the old SQLite path — leave it uncommitted.
- Bump `PRISMA_CACHE_VERSION` in `src/lib/db.ts` after every Prisma regeneration.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code (route handlers, dynamic imports).
- Tests: `npm test` → `node --test tests/unit`; no new test dependency.
- Verification: `npm test`, `npx tsc --noEmit --incremental false`, `npx eslint <changed files>`. Pre-existing errors in `examples/`, `mini-services/`, `src/components/app/automations/`, `src/components/app/forms/types.ts`, `src/components/landing/stats-bar.tsx` are out of scope.
- Commit every change as it is made.

## Review Focus

1. A Postgres connection must work with the supplied URL and no secrets in git (Task 1).
2. Existing contacts/campaigns/groups must survive the SQLite → Postgres copy with ids and relations intact (Task 1).
3. A `data:image/png` source in campaign content must become a CID attachment referenced as `cid:` in the sent HTML; the tracking pixel must stay an external URL (Task 3).
4. No image upload may write a file or DB row on the server; the editor must embed bytes in `content` (Task 3).
5. GrapesJS output must still pass through merge tags, CID conversion and tracking before send (Task 5).

---

### Task 1: Switch Prisma to Postgres and copy existing data

**Files:**
- Create: `.env.local` (untracked, holds DATABASE_URL)
- Modify: `prisma/schema.prisma`
- Delete/replace: `prisma/migrations/*` (SQLite migrations)
- Create: `scripts/migrate-sqlite-to-postgres.mjs`
- Modify: `src/lib/db.ts`

**Interfaces:**
- Produces: Postgres-backed `db` from `src/lib/db.ts` with all existing models; one initial migration applying the full schema to Supabase.

- [ ] **Step 1: Write `.env.local`** with `DATABASE_URL=<supplied pooler URL>` and verify it is gitignored (`git check-ignore -v .env.local`). Never stage it.

- [ ] **Step 2: Change `prisma/schema.prisma` datasource provider** from `sqlite` to `postgresql`; keep `url = env("DATABASE_URL")`. Keep all models unchanged in this step.

- [ ] **Step 3: Generate the initial Postgres migration** with `DATABASE_URL=… npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261122000000_init/migration.sql`, remove the old SQLite migration folders, add `migration_lock.toml` with `provider = "postgresql"`, then apply with `DATABASE_URL=… npx prisma migrate deploy`.

- [ ] **Step 4: Regenerate the client** (`DATABASE_URL=… npx prisma generate`) and bump `PRISMA_CACHE_VERSION` in `src/lib/db.ts` to `postgres-1`.

- [ ] **Step 5: Write `scripts/migrate-sqlite-to-postgres.mjs`** using `node:sqlite` `DatabaseSync` to read every table from the SQLite file and insert rows into Postgres via the generated client, in FK-safe order: SenderAccount, Contact, ContactGroup, Form, Campaign, ContactGroupAssignment, CampaignRecipient, FormSubmission, Workflow, AutomationEnrollment, Setting, StoredFile, TrackingToken, TrackingEvent, TrackingOpen. Preserve ids and timestamps.

- [ ] **Step 6: Run the copy script once** against the supplied database and verify row counts with a Prisma script (print counts, not data).

- [ ] **Step 7: Verify** — `npm test`, `npx tsc ...`, restart the dev server, and hit `GET /api/contacts`, `GET /api/campaigns`, `GET /api/stats`. Commit (never add `.env.local`).

### Task 2: Business font and no padding in the email template

**Files:**
- Modify: `prisma/schema.prisma` (+ migration if Phase 1 already applied)
- Modify: `src/lib/email-template.ts`
- Modify: `src/app/api/campaigns/route.ts`, `src/app/api/campaigns/[id]/route.ts`
- Modify: `src/components/app/campaigns/campaign-editor.tsx`
- Test: `tests/unit/email-template.test.ts`

**Interfaces:**
- Produces: `renderEmailHtml(content, { fontFamily }: RenderOptions)`, font allowlist `helvetica | arial | verdana | georgia`; `Campaign.fontFamily` persisted through create/patch.

- [ ] **Step 1: Write failing tests** for `renderEmailHtml`: default output contains `Helvetica`, no `padding:40px`, no `padding:24px`; `fontFamily: "georgia"` output contains `Georgia`; an unknown value falls back to Helvetica.

  Note: `email-template.ts` imports `./markdown` extensionlessly, so test the pure wrapper you extract into `src/lib/email-font.ts` (`getFontStack(value?: string): string`, `stripWrapperPadding(html: string): string`) instead of importing `email-template.ts` directly.

- [ ] **Step 2: Run the tests; expect failure**, then implement the two pure helpers and wire them into `renderEmailHtml`. Run tests to PASS.

- [ ] **Step 3: Add `fontFamily`** to Campaign (default `helvetica`), API create/patch, `CampaignDetail`, and a font `<select>` in the editor; include it in `buildCampaignPayload`.

- [ ] **Step 4: Apply the migration**, regenerate, bump `PRISMA_CACHE_VERSION` to `font-family-1`, verify with `npx tsc ...` and a POST/PATCH smoke test. Commit.

### Task 3: CID attachments instead of server-hosted images

**Files:**
- Create: `src/lib/email-cid.ts`
- Modify: `src/lib/gmail.ts`
- Modify: `src/components/app/campaigns/rich-text-editor.tsx`
- Delete: `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`
- Modify: `prisma/schema.prisma` (remove `StoredFile`) + migration
- Delete: `src/lib/email-media.ts`, `tests/unit/email-media.test.ts`
- Test: `tests/unit/email-cid.test.ts`

**Interfaces:**
- Produces: `inlineImagesToAttachments(html): { html: string; attachments: Array<{ cid: string; filename: string; content: Buffer; contentType: string }> }`.

- [ ] **Step 1: Write failing tests**: a `data:image/png;base64,...` src becomes `src="cid:…"` and yields one attachment with decoded bytes; a `blob:` src is removed; the tracking-pixel URL `.../api/t/TOKEN` is unchanged; a normal `https:` image is untouched.

- [ ] **Step 2: Run tests; expect failure**, then implement the pure helper and run tests to PASS.

- [ ] **Step 3: Replace `hostInlineImages` in `gmail.ts`** with the CID helper, pass `attachments` to `sendMail`, and remove the `StoredFile`/`db` dependency from the image path. Keep tracking rewrite after CID conversion.

- [ ] **Step 4: Change the editor** to convert picked/pasted/dropped image files to data URIs with `FileReader.readAsDataURL` and insert them directly; remove `/api/files` calls. Delete the file routes, `StoredFile` model, old helper and its test; apply migration, regenerate, bump cache version.

- [ ] **Step 5: Verify** — `npm test`, `npx tsc ...`, restart dev server, confirm `/api/files` returns 404 and a campaign with a data URI renders `cid:` in a captured HTML (unit test) while the pixel URL remains external. Commit.

### Task 4: EmailTemplate model and templates API

**Files:**
- Modify: `prisma/schema.prisma` + migration
- Create: `src/app/api/templates/route.ts`, `src/app/api/templates/[id]/route.ts`
- Test: `tests/unit/template-validation.test.ts`

**Interfaces:**
- Produces: `EmailTemplate { id, name, project, mjml?, html?, createdAt, updatedAt }`; `validateTemplate(input): { ok: boolean; error?: string }` with required `name` and at least one of `project`/`html`.

- [ ] **Step 1: Write failing tests** for `validateTemplate`: missing name rejected; missing both project and html rejected; valid input accepted.

- [ ] **Step 2: Implement and pass the tests.**

- [ ] **Step 3: Add the model**, migrate, regenerate, bump cache version.

- [ ] **Step 4: Implement CRUD routes** with JSON bodies: POST creates, GET lists, GET/PUT/DELETE by id. Validate with `validateTemplate`.

- [ ] **Step 5: Verify** — tests, tsc, curl create/list/get/update/delete. Commit.

### Task 5: GrapesJS editor and campaign integration

**Files:**
- Add dependencies: `grapesjs`, `grapesjs-mjml`
- Create: `src/components/app/templates/email-builder.tsx`, `src/components/app/templates/email-builder-client.tsx`, `src/lib/grapes-config.ts`
- Modify: `src/components/app/campaigns/campaign-editor.tsx`
- Test: `tests/unit/grapes-output.test.ts`

**Interfaces:**
- Produces: `prepareBuilderHtml(html: string): string` that normalizes GrapesJS output for the existing pipeline; `EmailBuilder` props `{ templateId?: string; onHtml: (html: string) => void }`.

- [ ] **Step 1: Read Next docs** for dynamic import with `ssr: false` and route handlers before coding.

- [ ] **Step 2: Write a failing test** that `prepareBuilderHtml` strips GrapesJS wrapper comments while keeping `<a href>` and `<img>` tags intact; implement and pass.

- [ ] **Step 3: Install dependencies** with pnpm (or npm if pnpm is unavailable) and commit the lockfile change.

- [ ] **Step 4: Build the client-only GrapesJS wrapper**: MJML plugin, desktop/375px devices, block manager, traits, restricted style sector with font family options, storage wired to `/api/templates`, and MJML→HTML export calling `onHtml`.

- [ ] **Step 5: Add a "Design" tab** to the campaign editor that mounts the builder and, on save, sets `contentType: "html"` and `content` to the exported HTML, preserving merge tags and the existing tracking/CID pipeline.

- [ ] **Step 6: Verify** — tests, tsc, eslint, and a browser smoke: load the builder, drop a block, save a template, apply it to a campaign. Commit.

## Final verification

- [ ] `npm test`, `npx tsc --noEmit --incremental false`, `npx eslint <changed files>`.
- [ ] Postgres row counts match the pre-migration SQLite counts.
- [ ] A campaign with an uploaded image sends HTML containing `cid:` references plus MIME attachments, while the tracking pixel is still an external `/api/t/…` URL.
- [ ] Whole-branch review with a fresh reviewer.
