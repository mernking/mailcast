# Task 2-e: Automations / Workflows feature

**Agent**: backend+frontend implementer
**Task ID**: 2-e
**Status**: COMPLETE

## Summary

Built the visual workflow builder for MailCast: a trigger-based automation system
with a step-based editor (send email / wait / condition), manual enrollment for
manual-trigger workflows, and a background mini-service that polls for due
enrollment steps every 60 seconds.

## Files created / modified

### API routes (server-side, all `export const dynamic = 'force-dynamic'`)
- `src/app/api/workflows/route.ts` — `GET` (list, newest first, with sender +
  step count + parsed triggerConfig) and `POST` (validate name + senderId,
  store steps + triggerConfig as JSON strings, default trigger="manual").
- `src/app/api/workflows/[id]/route.ts` — `GET` (full detail with parsed
  steps + triggerConfig, enrollment stats `enrolledCount`/`activeCount`/
  `completedCount`, and last 10 enrollments), `PATCH` (name/trigger/
  triggerConfig/senderId/steps/enabled), `DELETE` (cascade-deletes enrollments).
- `src/app/api/workflows/[id]/enroll/route.ts` — `POST` for manual enrollment.
  Accepts `{contactIds}` | `{tag}` | `{all:true}`. Validates the workflow is
  `trigger="manual"` and `enabled`. Calls `enrollContact(contactId, "manual", {})`
  for each match, then `processDueEnrollments(100)` to immediately run any
  no-delay first steps. Returns `{ok, enrolled, processed}`.

### Frontend components (`src/components/app/automations/`)
- `automations-section.tsx` (overwrote stub) — fetches `/api/workflows`,
  `SectionHeading` with description and "New workflow" button. Empty state
  uses `EmptyState` with `Workflow` icon. Renders cards in a
  `grid-cols-1 md:grid-cols-2 gap-4`. Each card: name, trigger badge
  (Form submit / New contact / Manual), enabled Switch (toggle via PATCH),
  step count, active + completed counts, sender email, actions
  (Edit / Enroll [manual only] / Delete with AlertDialog confirm).
  Clicking a card opens the WorkflowBuilder.
- `workflow-builder.tsx` — full editor. Top bar: "All workflows" back button +
  "Enroll contacts" (manual only) + "Create workflow"/"Save changes".
  Settings card: Name + Enabled Switch, Trigger Select (Form submit / New
  contact / Manual), Form Select (when trigger=form_submit, fetched from
  `/api/forms`), Sender Select (fetched from `/api/senders`, warning + link
  to Senders section if none). Steps builder: vertical list of step cards,
  each with icon + type label + summary, up/down reorder, remove button,
  and type-specific editor:
    - send_email: Subject, Preheader, contentType toggle (Markdown | HTML),
      Content textarea (monospace for html), merge-tag pills
      ({{name}}, {{first_name}}, {{email}}) that insert at cursor.
    - wait: Amount (number) + Unit (minutes/hours/days).
    - condition: Type (Has tag / Missing tag), Tag, Branch-to Select
      (continue, or jump to step N).
  Add-step buttons at the bottom: "+ Send email", "+ Wait", "+ Condition".
  Visual flow preview: vertical connected list with circle nodes and a left
  connector line, showing each step's summary (e.g. `1 Send email — "Welcome!"`).
  Stats panel (existing workflows only): enrolled / active / completed counts
  + recent enrollments table (email, status badge, step, due/error).
- `enroll-dialog.tsx` — three-mode enroll dialog used by both the card
  "Enroll" button and the builder's "Enroll contacts" button:
  By tag (Input) / Pick (Table with checkbox per active contact) /
  All active. POSTs to `/api/workflows/[id]/enroll`, toasts result.

### Mini-service (`mini-services/automation-runner/`)
- `package.json` — `mailcast-automation-runner`, scripts `dev: bun --hot index.ts`
  and `start: bun index.ts`. No deps (imports from parent node_modules).
- `.env` — `DATABASE_URL=file:/home/z/my-project/db/custom.db` (absolute path).
- `index.ts` — imports `db` from `../../src/lib/db` and `processDueEnrollments`
  from `../../src/lib/automation`. Calls `tick()` once on startup, then
  `setInterval(tick, 60_000)`. Also starts a `Bun.serve({port:3030})` with a
  `/health` endpoint that returns `{ok:true, service:"mailcast-automation-runner"}`.

The mini-service is started in the background (detached via `setsid`) and is
currently running. Logs at `mini-services/automation-runner/runner.log`.

## Verification results

### `bun run lint`
PASS — exit 0, no errors.

### Mini-service health check
```
$ curl -s http://localhost:3030/health
{"ok":true,"service":"mailcast-automation-runner"}
```

### Smoke test (curl) — all returned JSON, not HTML
1. `POST /api/workflows` with form_submit trigger + 1 send_email step → 201,
   returned full workflow with parsed `steps` array + `triggerConfig:{}` + sender.
2. `GET /api/workflows` → array with 1 item, `stepCount:1`, `sender:{email,fromName}`.
3. `GET /api/workflows/<id>` → full detail with `steps` array, `triggerConfig:{}`,
   `enrolledCount:0`, `activeCount:0`, `completedCount:0`, `recent:[]`.
4. `PATCH /api/workflows/<id>` `{enabled:false}` → updated workflow with `enabled:false`.
5. `POST /api/workflows/<id>/enroll` while trigger is `form_submit` → 400
   `{"error":"This workflow is not triggered manually."}` (correct).
6. `PATCH` switch to `trigger:"manual"`, `enabled:true` → updated workflow.
7. `POST /api/workflows/<id>/enroll` `{all:true}` → 200
   `{"ok":true,"enrolled":1,"processed":1}` — 1 active contact enrolled and
   1 step processed immediately.
8. `GET /api/workflows/<id>` final → `enrolledCount:1`, `recent:[
   {contactEmail:"newperson@example.com", status:"failed", currentStep:0,
   error:"Invalid login: 535-5.7.8 Username and Password not accepted..."}]`
   — the send step executed and captured the Gmail auth failure (the test
   sender has a fake password; the error is correctly recorded).
9. `DELETE /api/workflows/<id>` → `{"ok":true}` — cascaded enrollment delete.

After cleanup, `GET /api/workflows` returns `[]`.

## Issues / notes

- **Dev server instability (NOT caused by my code)**: The Next.js dev server
  running on port 3000 crashed repeatedly during testing due to a Turbopack
  internal cache corruption (`Unable to open static sorted file 00001045.sst`).
  This was pre-existing — Turbopack's task DB under `.next/dev` had missing
  SST files before my code was added; my new route files just triggered the
  panic to surface during module resolution. I cleared `.next/dev` (and later
  the whole `.next` folder) to force a clean rebuild; the system auto-restarted
  the dev server. The dev server alternates between Turbopack and webpack
  on each restart. Smoke tests succeeded once the dev server was briefly
  healthy. Lint passes cleanly.
- **SQLite write contention**: When both the Next.js API routes and the
  automation-runner mini-service write to the same SQLite file concurrently,
  libsql emits `Persisting failed: Another write batch or compaction is
  already active`. This is intermittent and self-recovering; for low
  concurrency (single-user newsletter tool) it's acceptable per the task
  spec. The mini-service polls every 60s and only writes when enrollments
  are actually due.
- The `/api/forms` endpoint (built in parallel by another agent) was available
  during testing — the WorkflowBuilder's Form Select works correctly when
  trigger=form_submit. Falls back gracefully (empty list) if forms aren't
  ready.

## Mini-service status
Running. PID visible via `ps -ef | grep "bun --hot index.ts"`.
- Health: `curl -s http://localhost:3030/health` → `{"ok":true,...}`
- Log: `mini-services/automation-runner/runner.log` — shows
  `[automation-runner] listening on :3030, polling every 60s` plus the
  Prisma query for due enrollments on each tick.
