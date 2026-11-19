# Task 2-f: Automation workflow builder (React Flow v13)

**Agent**: frontend implementer
**Task ID**: 2-f
**Status**: COMPLETE

## Summary

Rebuilt the MailCast automation workflow builder as a node-based visual canvas
using `@xyflow/react` (React Flow v13, already installed). The canvas supports
drag/connect/rearrange, branching (condition node with Yes / No output handles
+ AND / OR logic), 9 node types (trigger, sendEmail, sendTelegram, wait,
addTag, removeTag, addToGroup, removeFromGroup, condition), a right-side
property panel that opens whenever a node is clicked, and a node palette. The
graph is serialized to / hydrated from the existing `/api/workflows` graph
format (`{ nodes, edges }`); the denormalized `trigger` + `triggerConfig` are
derived from the trigger node on save.

## Files created / modified

### New (4 files)
- `src/components/app/automations/node-types.ts` — shared types, default data
  factories, icon + label metadata per node type, trigger-type metadata,
  a `summarize(node)` helper that produces the one-line description shown on
  each card, and `genId(prefix)`. All 9 node types registered with warm,
  earthy Tailwind color tokens (amber / emerald / slate / stone / teal /
  orange / purple / fuchsia / rose — NO saturated blue or indigo).
- `src/components/app/automations/flow-nodes.tsx` — custom React Flow node
  components (one per type) plus a shared `NodeShell` card layout. Handle
  placement:
    - target (top) for all nodes except `trigger`
    - source (bottom) for single-output nodes
    - condition: two source handles at the bottom, `id="true"` (left, green)
      and `id="false"` (right, muted), labeled "Yes" / "No"
  Components are wrapped in `React.memo`. Exports a `nodeTypes` map for
  `<ReactFlow nodeTypes={...} />`.
- `src/components/app/automations/property-panel.tsx` — right-side panel.
  - Empty state: hint ("Click a node to edit its properties") + node palette
    with one button per type. "Add trigger" is disabled once a trigger
    exists.
  - Selected state: per-type editor that calls `updateNodeData(id, partial)`
    on every change so both the panel and the on-canvas summary stay in
    sync. Includes:
      - trigger: triggerType select; form / tag / group selector depending
        on the chosen trigger; an info note about the entry point
      - sendEmail: subject, contentType Tabs (Markdown | HTML), body Textarea
        (monospace for HTML), merge-tag pills ({{name}}, {{first_name}},
        {{email}}) that insert at cursor, preheader input
      - sendTelegram: message Textarea + merge-tag pills + an info note about
        the bot-token / chat-id delivery semantics
      - wait: amount + unit (minutes / hours / days)
      - addTag / removeTag: tag input
      - addToGroup / removeFromGroup: group Select
      - condition: AND/OR segmented control (ToggleGroup) + a list of
        condition rows (field Select → Has tag / In group / Submitted form /
        Has Telegram; value Input or Select; add/remove row buttons)
  - A "Delete node" button at the bottom (disabled for the trigger node).
- (kept) `src/components/app/automations/automations-section.tsx` — list view.
  Updated trigger badge labels for the new triggers:
    - `form_submit` → "Form submitted"
    - `contact_added` → "New contact"
    - `contact_tagged` → "Contact tagged"
    - `contact_added_to_group` → "Added to group"
    - `manual` → "Manual"
  The list keeps its grid of cards (name, trigger badge, enabled Switch
  PATCH, step / active / done counts, sender email, Edit / Enroll [manual
  only] / Delete actions). "New workflow" and Edit both open the new
  WorkflowBuilder. The EnrollDialog is preserved unchanged.

### Overwritten (1 file)
- `src/components/app/automations/workflow-builder.tsx` — full React Flow
  builder. Layout: full-height container (`h-[calc(100vh-8rem)]`) with a
  compact TopBar (back button "← All workflows", inline name Input, sender
  Select, enabled Switch, Save button) and a flex main area below that
  contains:
    - canvas (`flex-1`, rounded border, `bg-card`) with `<ReactFlowProvider>`
      wrapping an inner component that uses `useNodesState` /
      `useEdgesState` / `useReactFlow`. Renders `<Background variant="dots">`,
      `<MiniMap>` (pannable + zoomable, warm per-type colors via
      `nodeColor`), `<Controls>`, and a top-left `<Panel>` with a small
      "Best viewed on a larger screen" hint on mobile only. Edges use the
      `smoothstep` type. Yes-branch edges are colored green; No-branch
      edges are muted + dashed. `fitView` on mount; `reactFlow.fitView()`
      after hydrating an existing workflow.
    - right property panel (`w-96` on desktop, full width stacked below the
      canvas on mobile via `flex-col-reverse md:flex-row`).
  - On "new": seeds a single trigger node at the origin and selects it.
  - On existing: `GET /api/workflows/[id]`, hydrates `nodes` + `edges` from
    `steps` (adding a trigger node if missing), sets name / senderId /
    enabled. `useFetch` is used for the workflow + senders + forms + groups.
  - Save: derives `trigger` + `triggerConfig` from the trigger node, builds
    the graph payload `{ nodes, edges }`, POST (new) or PATCH (existing)
    `/api/workflows/[id]` with `{ name, trigger, triggerConfig, senderId,
    steps, enabled }`. Toasts success and calls `onSaved` + `onClose`.

## Verification results

### `bun run lint`
PASS — exit 0, no errors.

### Dev server / compile
- The previously-running dev server on port 3000 had died (not caused by my
  code — the only stale error in the log was a pre-existing
  `ReferenceError: Send is not defined` from
  `src/components/app/contacts/contact-list.tsx`, fixed by another agent).
  I restarted it once via `nohup bun run dev` since port 3000 was free;
  the automation-runner mini-service on port 3030 was never touched.
- Initial compile surfaced one real bug in my code: `TagOff` does not exist
  in `lucide-react@0.525` (Turbopack: "The export TagOff was not found …
  Did you mean FlagOff?"). Replaced with `MinusCircle` for the removeTag
  icon. After the fix, `GET /` returns 200 cleanly (12s on first compile
  due to Turbopack cold start, ~1s on warm hits) with no further runtime
  errors.

### Smoke test (curl)
1. `POST /api/senders` → 201, returned the new sender (`cmwl8ocg5…`) with a
   Gmail auth warning (expected — fake password).
2. `POST /api/workflows` with the task's exact payload
   `{name:"Test flow", trigger:"manual", senderId, steps:{nodes:[trigger,
   sendEmail], edges:[{source:n1,target:n2}]}, enabled:true}` → 201,
   returned the full workflow including `steps:{nodes:[…], edges:[…]}` and
   `trigger:"manual"`, `triggerConfig:{}`.
3. `GET /api/workflows/<id>` → 200, full detail. `steps.nodes: 2`,
   `steps.edges: 1`. `enrolledCount: 0`, `activeCount: 0`,
   `completedCount: 0`, `recent: []`.
4. `DELETE /api/workflows/<id>` → `{"ok":true}`.
5. `GET /api/workflows` → `[]` after cleanup.
6. **Complex graph round-trip** (verified separately): POSTed a 4-node
   graph (trigger → condition → {sendEmail on true branch, wait on false
   branch}) with `sourceHandle: "true"` and `"false"` on the condition's
   two outgoing edges. GET back returned the exact same edge
   `sourceHandle` values `[None, "true", "false"]`, confirming the engine
   can resolve the correct branch.

The dev server is currently running on port 3000 (restarted by me after the
prior process had exited). The automation-runner mini-service on port 3030
is still running (untouched).

## Notes / issues
- The only icon-name surprise was `TagOff` — replaced with `MinusCircle`.
  All other Lucide icons used (`Zap`, `Mail`, `Send`, `Clock`, `Tag`,
  `Users`, `UserMinus`, `GitBranch`, `ArrowLeft`, `Loader2`, `Save`,
  `Plus`, `Trash2`, `Pencil`, `X`, `Info`, `MessageSquare`, `Workflow`,
  `Clock`, `CheckCircle2`, `MousePointerClick`, `UserPlus`, `FolderInput`,
  `MinusCircle`) exist in lucide-react@0.525.
- The `flow-nodes.tsx` `nodeTypes` map is cast through `unknown` when
  passed to `<ReactFlow nodeTypes={...}>` because each custom node uses
  `NodeProps<FlowNode>` (FlowNode carries our typed `data` union) rather
  than the default `NodeProps<Node>`. This is the documented pattern for
  strongly-typed custom nodes.
- The builder's right panel stacks below the canvas on small screens via
  `flex-col-reverse md:flex-row`, with the canvas keeping a `min-h-[400px]`
  so it remains usable. A small "Best viewed on a larger screen" note is
  shown inside a top-left React Flow `<Panel>` on mobile only.
- The `EnrollDialog` (`src/components/app/automations/enroll-dialog.tsx`)
  is currently a placeholder stub left by a previous agent. The
  automations-section passes the existing `workflowId` / `onClose` /
  `onDone` props to it, so manual enrollment from a card or from the
  builder can be wired up by a future agent without touching my code.
- Per the task instructions I did not click through the builder in a
  browser; verification was limited to lint, dev-log cleanliness, and API
  curl smoke tests.

## Files list (final)
- `src/components/app/automations/node-types.ts` (NEW)
- `src/components/app/automations/flow-nodes.tsx` (NEW)
- `src/components/app/automations/property-panel.tsx` (NEW)
- `src/components/app/automations/workflow-builder.tsx` (OVERWROTE stub)
- `src/components/app/automations/automations-section.tsx` (UPDATED)
