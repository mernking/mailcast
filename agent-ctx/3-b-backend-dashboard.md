# Task 3-b — Backend API + Dashboard for MailCast

**Agent**: backend-dashboard
**Task ID**: 3-b
**Date**: 2026-11-17

## Scope

Built the entire backend API surface (Next.js App Router route handlers under `src/app/api/*`) and the full dashboard UI (under `src/components/app/*`). The dashboard is rendered when `view === 'app'` in `src/app/page.tsx`. The only user-visible Next.js route is `/`; all API routes are backend endpoints.

## Files created

### API routes (all `export const dynamic = 'force-dynamic'`)

- `src/app/api/senders/route.ts` — `GET` lists senders (never returns `passwordEnc`), `POST` creates a sender with AES-256-GCM encrypted app password and verifies SMTP, returns `verified` + optional `warning`.
- `src/app/api/senders/[id]/route.ts` — `DELETE` removes a sender; returns 409 with a helpful message if campaigns still reference it (Prisma `onDelete: Restrict`).
- `src/app/api/senders/[id]/test/route.ts` — `POST { to }` sends a one-off test email via `sendTestEmail`, returns `{ ok, error? }`.
- `src/app/api/contacts/route.ts` — `GET ?q=&page=&limit=` paginated search; `POST { email, name?, tags? }` upserts by email.
- `src/app/api/contacts/[id]/route.ts` — `DELETE` removes a contact.
- `src/app/api/contacts/import/route.ts` — `POST { csv | emails | contacts[] }` parses CSV (lenient, optional header) or pasted emails, dedupes, upserts each, returns `{ imported, updated, skipped, total }`.
- `src/app/api/contacts/all/route.ts` — `DELETE` bulk-deletes all contacts (for the Settings danger zone).
- `src/app/api/campaigns/route.ts` — `GET` lists newest-first with sender info; `POST` creates a draft campaign.
- `src/app/api/campaigns/[id]/route.ts` — `GET` full detail, `PATCH` (only if `draft`/`failed`, else 409), `DELETE` (cascades recipients).
- `src/app/api/campaigns/[id]/stats/route.ts` — `GET` returns `totalRecip/sentCount/failedCount/pendingCount` + `recent[]` (last 50 recipients joined with contact email).
- `src/app/api/campaigns/[id]/send/route.ts` — `POST` the broadcast: marks `sending`, inserts pending `CampaignRecipient` rows for active contacts (filters existing pairs since SQLite's `createMany` doesn't support `skipDuplicates`), iterates sequentially calling `sendCampaignEmail`, updates each recipient + tracks counts, then marks `sent`. `export const maxDuration = 300`.
- `src/app/api/campaigns/all/route.ts` — `DELETE` bulk-deletes all campaigns.
- `src/app/api/stats/route.ts` — `GET` returns aggregate stats + last 5 campaigns + delivery rate.

### Dashboard components

- `src/components/app/dashboard.tsx` — `Dashboard` shell: `flex min-h-screen` with desktop sidebar (`w-60`, `bg-sidebar`) + main column (`Topbar` + scrollable content). Routes on `section` + `editingCampaignId` from the Zustand store.
- `src/components/app/sidebar.tsx` — dark charcoal sidebar with MailCast logo (paper-plane icon), nav buttons (Overview/Campaigns/Contacts/Senders/Settings) with active/hover states, "Free plan" card + "Back to site" link.
- `src/components/app/topbar.tsx` — sticky topbar `h-14`, mobile hamburger that opens a `Sheet` containing the sidebar, contextual section title, optional action slot.
- `src/components/app/overview.tsx` — 4 stat cards (`StatCard`) from `/api/stats`, recent campaigns table, Gmail limits info card.
- `src/components/app/campaigns/campaign-list.tsx` — table of campaigns with status badges, edit/delete actions, empty state CTA.
- `src/components/app/campaigns/campaign-editor.tsx` — full editor: title/subject/preheader/sender/content fields, Write/Preview tabs (`react-markdown` for preview), merge-tag pill buttons that insert at cursor, save draft (POST or PATCH), send broadcast `AlertDialog`, post-send stats panel with progress bar + recent deliveries table, polls stats every 3s while `status==='sending'`.
- `src/components/app/contacts/contact-list.tsx` — debounced search, paginated table, add-contact dialog, delete confirm.
- `src/components/app/contacts/import-dialog.tsx` — tabs for "Paste CSV" and "Paste emails", posts to `/api/contacts/import`.
- `src/components/app/senders/sender-list.tsx` — sender cards with verified badge, "Test" dialog, delete confirm.
- `src/components/app/senders/add-sender-dialog.tsx` — form with email/from-name/password (show/hide), inline help for creating an app password.
- `src/components/app/settings.tsx` — Gmail sender summary, Gmail limits, privacy/security explanation, danger zone (delete all contacts / delete all campaigns).
- `src/components/app/use-api.ts` — `useFetch<T>(url)` hook (AbortController + refetch), `apiFetch()` mutation helper, `fmtDate`/`fmtDateTime`/`truncate` utilities.
- `src/components/app/stat-card.tsx`, `empty-state.tsx`, `section-heading.tsx`, `status-badge.tsx` — shared presentational helpers.

### Modified

- `src/app/layout.tsx` — added `SonnerToaster` (from `@/components/ui/sonner`) next to the existing radix `Toaster` so `toast()` from sonner renders. Configured `position="bottom-right" richColors closeButton`.

## Important implementation notes

- **Prisma schema caveat**: the `Contact.email` field is `@@index`-ed but NOT `@unique`. So `findUnique({ where: { email } })` and `upsert({ where: { email } })` are NOT valid — Prisma throws. The contact POST and import routes use `findFirst({ where: { email } })` + `update`/`create` instead, deduping at the application layer. The next agent should follow the same pattern.
- **SQLite `createMany` does not support `skipDuplicates`** in Prisma 6.x. The send route pre-fetches existing `campaignId/contactId` pairs and filters them out before `createMany`.
- **Send route runs synchronously** inside the request with `export const maxDuration = 300`. Sequential awaits (the pooled gmail transport handles parallelism + rate limiting under the hood). A `warning` is returned when `totalRecip > 400` reminding the user about Gmail daily limits.
- **`useAppStore.openCampaignEditor('new')`** uses the string `'new'` as a sentinel meaning "create a new campaign"; a real cuid means "edit existing". The editor checks `campaignId === 'new'`.
- **Sonner toast** is the notification system. Import `{ toast } from 'sonner'`. The Sonner `<Toaster />` is mounted in `src/app/layout.tsx`.
- **No new page routes** were created. Only API routes + client components.

## Verification

### `bun run lint`
Passes clean (0 errors, 0 warnings).

### Curl smoke test (all return JSON, not HTML)
```
/api/stats       → {"totalContacts":0,"activeContacts":0,...,"recentCampaigns":[]}
/api/senders     → []  (after cleanup)
/api/contacts    → {"items":[],"total":0,"page":1,"limit":50}
/api/campaigns   → []
```

### End-to-end smoke test
1. POST `/api/senders` with fake password → 201 with `verified:false` + `warning` (535 auth error from Gmail).
2. POST `/api/contacts` "alice@example.com" → 201.
3. POST `/api/contacts/import` CSV with 4 rows (1 bad email + 1 dup) → `{"imported":2,"updated":0,"skipped":2,"total":2}`.
4. POST `/api/contacts/import` emails list (3 emails incl. 1 existing) → `{"imported":2,"updated":1,"skipped":0,"total":3}`.
5. POST `/api/campaigns` with senderId → 201, status `draft`.
6. GET `/api/campaigns/[id]` → full campaign detail.
7. PATCH `/api/campaigns/[id]` (subject change) → 200.
8. GET `/api/campaigns/[id]/stats` → `{totalRecip, sentCount, failedCount, pendingCount, recent:[]}`.
9. POST `/api/campaigns/[id]/send` → `{ok:true, totalRecip:2, sentCount:0, failedCount:2}` (each recipient failed with 535 Gmail auth error, as expected with fake password). Campaign flipped to `status:sent`.
10. GET `/api/campaigns/[id]/stats` post-send → recent deliveries with error messages populated.
11. POST `/api/senders/[id]/test` → 400 `{ok:false, error:"Invalid login: 534..."}`.
12. DELETE `/api/senders/[id]` while campaign references it → 409 `"Delete campaigns using this sender first."`.
13. DELETE `/api/campaigns/all` → `{ok:true, deleted:1}`.
14. DELETE `/api/contacts/all` → `{ok:true, deleted:N}`.
15. DELETE `/api/senders/[id]` after campaigns gone → 200.

### Dashboard UI smoke test (via agent-browser)
Set `localStorage["mailcast-view"]='{"state":{"view":"app","section":"overview"},...}'`, reloaded, navigated through every section:
- Overview renders 4 stat cards, empty-state "No campaigns yet" with CTA, Gmail limits card.
- Campaigns renders list with "New campaign" button; clicking CTA opens the editor with title/subject/preheader/sender combobox (disabled, "No senders added"), Write/Preview tabs, merge-tag pills, disabled Send button.
- Senders renders empty state with "Add Gmail sender" CTA; clicking opens AddSenderDialog with email/from-name/password (show/hide), help panel linking to myaccount.google.com.
- Contacts renders search input, Import + Add contact buttons, empty state with CTA; AddContact dialog successfully creates a contact (verified via API afterwards).
- Settings renders Gmail sender summary, limits, privacy/security, danger zone with Delete contacts / Delete campaigns buttons + Back to site link.

No console errors, no runtime errors, no compile errors.

## Known limitations / future work

- The send route is synchronous; for very large lists (>400 recipients) the user is warned but the request may approach the 300s timeout. A background-job queue (e.g. a separate mini-service processing the recipient queue) would be the production-grade fix.
- No `react-markdown` plugins (no `remark-gfm`), so tables/strikethrough/autolink aren't rendered in the preview pane (basic markdown works).
- Sonner `toast.warning` may not be styled distinctly in all themes — fell back to richColors.
- No authentication layer — anyone hitting `/api/*` can mutate data. NextAuth.js v4 is available if a future agent needs to add it.

## Status

Done. `bun run lint` passes. All API routes return JSON. Dashboard renders cleanly across all 5 sections + campaign editor + dialogs.
