# Task 2-g: Contact groups feature (MailCast)

Agent: 2-g (Contact groups)
Status: Complete
Date: 2026-11-17

## Summary
Built the full Contact groups feature for MailCast: create groups/collections,
group the contact list by them, link forms to groups (form submissions
auto-populate a group), add a Telegram username field type to forms, and let
campaigns target a specific group.

## Files created

### Groups API (`src/app/api/groups/`)
- `route.ts` — `export const dynamic = 'force-dynamic'`.
  - `GET` → lists all groups newest first, with `contactCount`
    (`_count: { select: { assignments: true } }`) and `formName` (if linked).
    Returns `{ id, name, description, color, formId, formName, contactCount,
    createdAt }`.
  - `POST` body `{ name, description?, color? }` → creates a group. Validates
    name non-empty, color must be a hex string (defaults to `#1a1a1a`).
    Returns the created group with `contactCount: 0`.
- `[id]/route.ts` — `GET` detail, `PATCH` (name/description/color),
  `DELETE` (cascade via schema; forms linked via formId get formId set to null
  by the schema's onDelete: SetNull).
- `[id]/contacts/route.ts` — `GET` paginated list of contacts in this group
  with `?q=` search (filters via `contact: { OR: [...] }` on the join). Returns
  `{ items: [{id, email, name, tags, active, telegram, createdAt}], total,
  page, limit }`. `POST` body `{ contactIds: string[] }` upserts each
  membership (`contactGroupAssignment.upsert` on the unique
  `[contactId, groupId]`) → returns `{ added }`. `DELETE` accepts either
  `?contactId=...` query OR `{ contactId }` JSON body and removes the
  membership.

## Files modified

### Forms API (`src/app/api/forms/`) — group linking
- `route.ts` (POST) and `[id]/route.ts` (GET / PATCH) — added support for an
  optional `linkGroupId` (string) or `createGroupForForm` (boolean) field in
  the request body. The group owns the link via its unique `ContactGroup.formId`,
  so linking logic is:
    - `linkGroupId === "__none__"` → clear any currently-linked group.
    - `linkGroupId === "<id>"` → relink to that group (clearing any other
      group that previously pointed at this form first, since `formId` is
      @unique).
    - `createGroupForForm === true` → create a new `ContactGroup` named after
      the form with `formId = form.id`.
  All GET responses now include `linkedGroup: { id, name } | null` by
  including `group: { select: { id, name } }` in the Prisma query.
- The submit route (`src/app/api/forms/[id]/submit/route.ts`) was already
  wired to read `form.group?.id` and upsert a `ContactGroupAssignment` on
  submit. With the link now creatable from the form builder, submissions land
  in the linked group end-to-end.

### Forms UI (`src/components/app/forms/`)
- `types.ts` — added `"telegram"` to the `FieldType` union. Added a
  `FIELD_TYPE_LABELS` map (Text/Email/Name/Phone/Telegram) used by both the
  field-row Select and any other consumer. Added `LinkedGroup` interface
  (`{ id, name }`) and `linkedGroup: LinkedGroup | null` field on both
  `FormSummary` and `FormFull` so the UI can render the link.
- `form-preview.tsx` — telegram-typed fields render with a leading `@` prefix
  (flex container with an `@` glyph + a borderless inner input), mirroring
  how the embed snippet renders a Telegram username input. Other types
  unchanged.
- `form-builder.tsx` — added a "Recipient group" section to the editor
  column with a Select offering:
    - "No group (submissions only add to your list)"
    - "Create a new group for this form"
    - Existing groups (with colored dot + member count + disabled state when
      already linked to a different form, with the form name shown).
  The Select's value is mapped to the API's `linkGroupId` / `createGroupForForm`
  / `"__none__"` semantics in `buildPayload()`. After save, the freshly
  resolved `linkedGroup` from the API response is reflected locally + a
  note is shown ("Submissions to this form are automatically added to the
  linked group"). Also switched the field-type Select to iterate
  `FIELD_TYPE_LABELS` so the Telegram option appears.

### Contacts UI (`src/components/app/contacts/contact-list.tsx`) — full rewrite
- Two-column layout on desktop: a left **groups rail** (sticky, `w-56`-ish
  via `md:grid-cols-[14rem_1fr]`, `bg-card border rounded-2xl p-3`,
  `max-h-[80vh] overflow-y-auto scroll-thin`) + the main contacts table on
  the right.
- On mobile, the rail collapses into a `Select` (with `SelectGroup` +
  `SelectLabel` for "Groups") + a separate "New group" icon button.
- Groups rail:
  - "All contacts" item with the sum of group counts as its badge.
  - Each group: colored dot, name, member-count badge, a small `…` menu
    (DropdownMenu) with Edit + Delete actions.
  - A `+` button at the top opens the create-group dialog.
- When a group is selected, the table fetches `/api/groups/[id]/contacts`
  (same paginated/search contract as `/api/contacts`). When "All contacts"
  is selected, it fetches `/api/contacts` as before.
- Added a **Telegram column** between Tags and Status showing `@username`
  or `—`.
- Added an **"Add to group"** action per contact row: a `FolderPlus` icon
  that opens a `DropdownMenu` of groups (with colored dots + counts). When
  a group filter is active, the icon flips to a `UserPlus` (rotated) "Remove
  from group" action instead. Both have loading + toast states.
- Active filter context pill ("Showing: [group name]" with a colored dot
  and a Clear `X` button) appears above the table when a group is selected.
- All existing features kept: search (debounced 300ms), add-contact dialog,
  import dialog, delete-with-confirm. A new `GroupEditorDialog` handles
  both create and edit flows (name, description, color picker) with toasts.

### Campaign editor (`src/components/app/campaigns/campaign-editor.tsx`)
- Added `targetGroupId: string | null` to the `CampaignDetail` interface
  and a new `GroupSummary` interface (`{ id, name, color, contactCount,
  formName? }`).
- Added a `useFetch<GroupSummary[]>("/api/groups")` and a `targetGroupId`
  state (`"__all__"` sentinel = no group).
- The `useEffect` hydration now sets `targetGroupId` from the loaded
  campaign (or resets to `"__all__"` for new campaigns).
- Added a **Recipients** Select (right after the Sender Select) with:
    - "All active contacts" (default, with active count from `/api/stats`)
    - Existing groups (with colored dots + `~count`)
  The Save payload now includes `targetGroupId: targetGroupId !== "__all__"
  ? targetGroupId : null`.
- Updated the footer "Will send to X active contacts" text + the Send
  confirmation alert to reflect the selected group:
  "Will send to ~N contacts in [group name]." / "Send to ~N contacts in
  [group name] now?" when a group is selected; the existing wording when
  "All".
- The "No active contacts" warning becomes "No contacts in [group name]"
  when a group with zero members is selected, with a "Manage group" link.

### Pre-existing bug fixed (out-of-scope, blocked compilation)
- `src/components/app/automations/node-types.ts` — the lucide-react version
  installed doesn't export `TagOff`. Replaced the import + usage with `Tags`
  (which exists in this version). Without this fix, every API route was
  returning a 500 error page because `dashboard.tsx` → `automations-section`
  → `workflow-builder` → `node-types` is in the page.tsx compile graph and
  a broken import blocks all responses (including `/api/*`) in dev mode.

## Smoke-test results (all passed end-to-end)
1. `POST /api/groups` `{"name":"Newsletter list","color":"#1a1a1a","description":"smoke test"}`
   → 201 `{id, name, description, color, formId:null, formName:null, contactCount:0, createdAt}`.
2. `GET /api/groups` → `[{id, name, description, color, formId, formName, contactCount, createdAt}]`.
3. `POST /api/forms` with `linkGroupId` + a `telegram` field:
   `{"name":"Signup","tagsToAdd":"news","linkGroupId":"<gid>","fields":[{email...},{name:"telegram",type:"telegram"...}]}`
   → 201 with `linkedGroup: { id, name: "Newsletter list" }`.
4. `POST /api/forms/<formId>/submit` `{"email":"groupie@example.com","name":"Groupie","telegram":"groupie_user"}`
   → `{ok:true, message:"Thanks for subscribing!"}`.
5. `GET /api/groups/<gid>/contacts` → `{"items":[{id, email:"groupie@example.com", name:"Groupie", tags:"news", active:true, telegram:"groupie_user", createdAt}], total:1, page:1, limit:50}` — the contact landed in the linked group automatically, with the telegram username stored.
6. `PATCH /api/groups/<gid>` `{"name":"Renamed list","color":"#0f766e"}` → 200 with renamed group, color updated, `formId`/`formName`/`contactCount` preserved.
7. `POST /api/groups/<gid2>/contacts` `{"contactIds":["<cid>"]}` → `{added:1}`.
8. `DELETE /api/groups/<gid>/contacts?contactId=<cid>` → `{ok:true}`; verified first group now `total=0`.
9. `POST /api/forms` with `createGroupForForm:true` → 201 with `linkedGroup: { id, name: <form name> }` (group auto-created).
10. `PATCH /api/forms/<formId>` `{"linkGroupId":"__none__"}` → 200 with `linkedGroup: null` (cleared).
11. `POST /api/campaigns` with `targetGroupId:"<gid>"` → 201 with `targetGroupId` echoed back.
12. `GET /api/campaigns/<cid>` → `targetGroupId=<gid>, status=draft`.
13. `PATCH /api/campaigns/<cid>` `{"targetGroupId":null}` → 200 with `targetGroupId=null`.

## Cleanup
All smoke-test data deleted via DELETE endpoints (1 group, 2 forms, 1
campaign, 1 sender, 1 contact, plus the auto-created form group). Verified
`/api/groups`, `/api/forms`, `/api/campaigns`, `/api/senders` all return
empty arrays and `/api/contacts` returns `total=0` — the user starts fresh.

## Lint
`bun run lint` passes with zero errors / zero warnings.

## Dev log
Most recent lines show `GET /api/groups 200`, `GET /api/forms 200`,
`GET /api/contacts 200`, `GET /api/campaigns 200`, `GET /api/senders 200`,
`DELETE /api/senders/... 200`, `DELETE /api/campaigns/... 200`. No runtime
errors in any groups/forms/contacts/campaigns route. The earlier transient
"Send is not defined" error was from an intermediate draft of the contact
list (a leftover `void Send;` line) — removed before final lint; the
"TagOff doesn't exist" error was the pre-existing automations bug fixed
above. The dev server crashed a few times under turbopack memory pressure
during editing but was restarted manually (`bun run dev`); port 3000 is now
serving 200s cleanly.

## Notes for downstream agents
- The group owns the form-link (`ContactGroup.formId` is the @unique FK).
  To change which group a form feeds, send `linkGroupId: "<new id>"` on the
  form PATCH — the API clears the previous group's link first.
- The sentinel `"__none__"` for `linkGroupId` explicitly clears the link.
  Omitting `linkGroupId` entirely preserves whatever is currently linked
  (useful for editing just the form fields without touching the group).
- `createGroupForForm: true` creates a new group named after the form and
  links it. It is mutually exclusive with `linkGroupId` (link wins if both
  are sent).
- Campaign send route (`/api/campaigns/[id]/send`) already restricts to
  `targetGroupId` when set — saving `targetGroupId` from the editor is
  enough; no send-route changes were needed.
- The submit route stores the telegram username on the Contact
  (`contact.telegram`) and also echoes it inside `FormSubmission.data` so
  it shows up in submission exports.
- The contacts table's "Telegram" column reads `contact.telegram`. Existing
  contacts without a telegram username show `—`.
