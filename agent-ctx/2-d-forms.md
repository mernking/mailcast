# Task 2-d: Forms feature (MailCast)

Agent: 2-d (Forms)
Status: Complete
Date: 2026-11-17

## Summary
Built the full Forms feature for MailCast: signup forms designed in a visual
builder, embedded on external sites via copy-paste snippets, with submissions
collected into the contacts list and triggering automations.

## Files created
- `src/app/api/forms/route.ts` — GET (list newest-first with submissionCount),
  POST (create; defaults to a required email field).
- `src/app/api/forms/[id]/route.ts` — GET (full form, parsed fields, submissionCount),
  PATCH (update editable fields), DELETE (cascades submissions).
- `src/app/api/forms/[id]/submissions/route.ts` — GET paginated submissions
  (`?page=&limit=`, default 50), parsed `data` JSON.
- `src/app/api/forms/[id]/submit/route.ts` — PUBLIC submit endpoint. Accepts
  JSON and url-encoded/multipart form data. Validates email, upserts Contact
  (merge tags, source="form"), creates FormSubmission, triggers
  `enrollContact("form_submit", {formId})` + `processDueEnrollments()`.
  Permissive CORS headers + OPTIONS preflight handler.
- `src/components/app/forms/types.ts` — shared types (FormField, FormSummary,
  FormFull, FormSubmission) + helpers (suggestName, defaults).
- `src/components/app/forms/form-preview.tsx` — inline-styled live form preview
  (mirrors the embed rendering exactly, no Tailwind dependency).
- `src/components/app/forms/form-builder.tsx` — large Dialog builder: fields
  editor (add/remove/reorder, type select, required switch, placeholder),
  settings (name, button text, success message, redirect URL, tags), color
  pickers, real-time live preview, Save + "Save & get embed code".
- `src/components/app/forms/embed-dialog.tsx` — Tabs (HTML form | JavaScript
  embed). Generates valid, copy-pasteable snippets using
  `window.location.origin` (computed client-side) as the submit URL. Copy
  buttons + live preview.
- `src/components/app/forms/submissions-dialog.tsx` — Table of submissions
  (email, name, extra data, date), pagination, "Download CSV" (Blob download).
- `src/components/app/forms/forms-section.tsx` — OVERWRITTEN from stub.
  SectionHeading + New form button, EmptyState, card grid
  (md:grid-cols-2 lg:grid-cols-3), each card shows mini preview + tags +
  submission count + Edit/Embed/Submissions/Delete actions.

## Files modified
- `src/lib/db.ts` — NO net change to logic. The file already had a
  `PRISMA_CACHE_VERSION` invalidation mechanism; I left it at its existing
  value `campaign-contentType-1` (the running dev server was restarted by the
  system with a fresh `.next` cache, so the current generated Prisma client —
  which includes Form/FormSubmission/Workflow/AutomationEnrollment — is now
  loaded). During development I briefly tried require-cache busting and a
  version bump, but those caused turbopack instability; reverting to the
  original db.ts + a fresh server restart resolved the stale-client issue.

## Important environment note
The dev server's turbopack persistent cache was corrupted
("Unable to open static sorted file *.sst" / "Persisting failed" panics in
dev.log). The original long-lived server process (started 19:14, before the
Form model was generated at 20:35) held a stale PrismaClient in globalThis
that lacked the `form`/`formSubmission`/`workflow`/`automationEnrollment`
delegates. Clearing `.next` + letting the system auto-restart the dev server
produced a fresh process that loads the current generated client, so all
Form delegates now work. The system manages the dev server (auto-restarts
`bun run dev` with turbopack on port 3000); do not try to run a competing
`bun run dev` — it will be killed and cause EADDRINUSE churn.

## Smoke test results (all passed)
- POST /api/forms `{"name":"Newsletter signup","tagsToAdd":"newsletter"}`
  -> 201, full form object with default email field.
- GET /api/forms -> `{"items":[{id,name,buttonText,tagsToAdd,fields,colors,createdAt,submissionCount}]}`.
- POST /api/forms/<id>/submit (JSON) `{"email":"newperson@example.com","name":"New Person"}`
  -> `{"ok":true,"message":"Thanks for subscribing!"}`.
- POST /api/forms/<id>/submit (url-encoded) -> ok:true (formData parsing works).
- POST /api/forms/<id>/submit (invalid email) -> 400 `{"ok":false,"error":"A valid email is required"}`.
- OPTIONS /api/forms/<id>/submit -> 204 with CORS headers
  (access-control-allow-origin: *, methods: POST,OPTIONS, headers: Content-Type).
- GET /api/forms/<id>/submissions -> paginated items with parsed data, contactId.
- GET /api/contacts?q=newperson -> contact created (tags="newsletter", source="form", active=true).
- GET /api/forms/<id> -> full form with parsed fields + submissionCount.
- PATCH /api/forms/<id> -> updates buttonText/accentColor etc.
- DELETE /api/forms/<id> -> ok:true (cascades submissions).

## Cleanup
Test form + both test contacts (newperson@example.com, urlencoded@example.com)
deleted via DELETE endpoints. Verified forms list and contact searches return
empty afterward — user starts fresh.

## Lint
`bun run lint` passes with zero errors/warnings.

## Dev log
Most recent forms-related log lines show 200s (GET/DELETE /api/forms...). No
runtime errors in any forms route. (Earlier "Failed to start server" /
EADDRINUSE lines are stale, from the transient restart churn while clearing
the corrupted turbopack cache.)

## Notes for downstream agents
- The `enrollContact`/`processDueEnrollments` calls in the submit route are
  wrapped in try/catch — if automations infra (Workflow model) isn't set up
  yet, submissions still succeed; automations just won't fire.
- The submit route uses `findFirst` by email (email is indexed, not unique in
  the schema) and merges tags, matching the contacts API upsert pattern.
- Embed snippets compute the submit URL from `window.location.origin` at
  generation time in the EmbedDialog (client component), baking the absolute
  MailCast origin into both the HTML form action and the JS fetch endpoint.
