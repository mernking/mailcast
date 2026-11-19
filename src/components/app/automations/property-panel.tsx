"use client";

/**
 * Right-side property panel for the workflow builder.
 *
 * When a node is selected, the panel renders an editor for that node's `data`.
 * Edits call `updateNodeData(id, partialData)` which mutates the node in the
 * parent's nodes state — both the panel and the on-canvas node summary stay in
 * sync because they read from the same source.
 *
 * When nothing is selected, the panel shows a hint plus the node palette.
 */

import { useRef } from "react";
import { Plus, Trash2, X, Info, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import { cn } from "@/lib/utils";
import {
  NODE_META,
  TRIGGER_OPTIONS,
  TRIGGER_META,
  type ConditionField,
  type ConditionItem,
  type ConditionLogic,
  type EmailContentType,
  type FlowNode,
  type NodeType,
  type TriggerData,
  type WaitUnit,
  type WorkflowTrigger,
} from "./node-types";

export interface Option {
  id: string;
  name: string;
}

interface PropertyPanelProps {
  selectedNode: FlowNode | null;
  forms: Option[];
  groups: Option[];
  updateNodeData: (id: string, partial: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
  onAddNode: (type: NodeType) => void;
  hasTrigger: boolean;
}

export function PropertyPanel({
  selectedNode,
  forms,
  groups,
  updateNodeData,
  onDeleteNode,
  onAddNode,
  hasTrigger,
}: PropertyPanelProps) {
  if (!selectedNode) {
    return <PalettePanel onAddNode={onAddNode} hasTrigger={hasTrigger} />;
  }
  return (
    <NodeEditor
      node={selectedNode}
      forms={forms}
      groups={groups}
      updateNodeData={updateNodeData}
      onDeleteNode={onDeleteNode}
    />
  );
}

// ---------------------------------------------------------------------------
// Empty-state panel — hint + palette of addable node types.
// ---------------------------------------------------------------------------

function PalettePanel({
  onAddNode,
  hasTrigger,
}: {
  onAddNode: (type: NodeType) => void;
  hasTrigger: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Info className="size-4 text-muted-foreground" />
          Click a node to edit its properties
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag from a node's bottom dot onto another node's top dot to connect
          them. Click an edge and press Delete to remove it.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Add node
        </div>
        <div className="grid grid-cols-1 gap-2">
          <PaletteButton
            type="trigger"
            disabled={hasTrigger}
            disabledReason="Only one trigger per workflow"
            onClick={() => onAddNode("trigger")}
          />
          <PaletteButton type="sendEmail" onClick={() => onAddNode("sendEmail")} />
          <PaletteButton
            type="sendTelegram"
            onClick={() => onAddNode("sendTelegram")}
          />
          <PaletteButton type="wait" onClick={() => onAddNode("wait")} />
          <PaletteButton type="addTag" onClick={() => onAddNode("addTag")} />
          <PaletteButton type="removeTag" onClick={() => onAddNode("removeTag")} />
          <PaletteButton
            type="addToGroup"
            onClick={() => onAddNode("addToGroup")}
          />
          <PaletteButton
            type="removeFromGroup"
            onClick={() => onAddNode("removeFromGroup")}
          />
          <PaletteButton
            type="condition"
            onClick={() => onAddNode("condition")}
          />
        </div>
      </div>
    </div>
  );
}

function PaletteButton({
  type,
  onClick,
  disabled,
  disabledReason,
}: {
  type: NodeType;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const meta = NODE_META[type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : `Add ${meta.label}`}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors",
        "hover:border-foreground/30 hover:bg-muted/50",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-md shrink-0",
          meta.chip,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="text-foreground">{meta.label}</span>
      <Plus className="ml-auto size-3.5 text-muted-foreground" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Selected-node editor shell + per-type forms.
// ---------------------------------------------------------------------------

function NodeEditor({
  node,
  forms,
  groups,
  updateNodeData,
  onDeleteNode,
}: {
  node: FlowNode;
  forms: Option[];
  groups: Option[];
  updateNodeData: (id: string, partial: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
}) {
  const meta = NODE_META[node.type];
  const Icon = meta.icon;
  const data = node.data as Record<string, unknown>;

  const set = (partial: Record<string, unknown>) =>
    updateNodeData(node.id, partial);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md shrink-0",
            meta.chip,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {meta.label}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            Node id: <span className="font-mono">{node.id.slice(0, 12)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        <div className="flex flex-col gap-4 p-4">
          {node.type === "trigger" && (
            <TriggerEditor data={data as unknown as TriggerData} set={set} forms={forms} groups={groups} />
          )}
          {node.type === "sendEmail" && (
            <SendEmailEditor data={data} set={set} />
          )}
          {node.type === "sendTelegram" && (
            <SendTelegramEditor data={data} set={set} />
          )}
          {node.type === "wait" && <WaitEditor data={data} set={set} />}
          {(node.type === "addTag" || node.type === "removeTag") && (
            <TagEditor data={data} set={set} />
          )}
          {(node.type === "addToGroup" ||
            node.type === "removeFromGroup") && (
            <GroupEditor data={data} set={set} groups={groups} />
          )}
          {node.type === "condition" && (
            <ConditionEditor data={data} set={set} forms={forms} groups={groups} />
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-lg text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={() => onDeleteNode(node.id)}
          disabled={node.type === "trigger"}
          title={
            node.type === "trigger"
              ? "The trigger node cannot be deleted"
              : "Delete this node and its connections"
          }
        >
          <Trash2 className="size-3.5" />
          Delete node
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field helpers.
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <Info className="size-3.5 mt-0.5 shrink-0" />
      <p className="leading-snug">{children}</p>
    </div>
  );
}

function MergeTags({ onPick }: { onPick: (tag: string) => void }) {
  const tags = ["{{name}}", "{{first_name}}", "{{email}}"];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Merge tags
      </span>
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="rounded-full border bg-card px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-type editors.
// ---------------------------------------------------------------------------

function TriggerEditor({
  data,
  set,
  forms,
  groups,
}: {
  data: TriggerData;
  set: (p: Record<string, unknown>) => void;
  forms: Option[];
  groups: Option[];
}) {
  const triggerType = data.triggerType || "manual";
  const config = data.config || {};
  const meta = TRIGGER_META[triggerType];

  const setTriggerType = (tt: WorkflowTrigger) => {
    set({ triggerType: tt, config: {} });
  };

  const setConfig = (partial: Record<string, unknown>) => {
    set({ config: { ...config, ...partial } });
  };

  return (
    <>
      <Field label="Trigger type">
        <Select value={triggerType} onValueChange={(v) => setTriggerType(v as WorkflowTrigger)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a trigger" />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {meta?.needs === "form" && (
        <Field label="Form" hint="Contacts enter the flow when this form is submitted.">
          <Select
            value={config.formId || ""}
            onValueChange={(v) => setConfig({ formId: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={forms.length === 0 ? "No forms available" : "Pick a form"} />
            </SelectTrigger>
            <SelectContent>
              {forms.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No forms yet
                </SelectItem>
              ) : (
                forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </Field>
      )}

      {meta?.needs === "tag" && (
        <Field
          label="Tag"
          hint="Contacts enter the flow the moment this tag is added to them."
        >
          <Input
            value={config.tag || ""}
            placeholder="e.g. vip"
            onChange={(e) => setConfig({ tag: e.target.value })}
          />
        </Field>
      )}

      {meta?.needs === "group" && (
        <Field
          label="Group"
          hint="Contacts enter the flow when they're added to this group."
        >
          <Select
            value={config.groupId || ""}
            onValueChange={(v) => setConfig({ groupId: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={groups.length === 0 ? "No groups available" : "Pick a group"} />
            </SelectTrigger>
            <SelectContent>
              {groups.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No groups yet
                </SelectItem>
              ) : (
                groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Note>
        This is the entry point — contacts enter the flow when this trigger
        fires.
      </Note>
    </>
  );
}

function SendEmailEditor({
  data,
  set,
}: {
  data: Record<string, unknown>;
  set: (p: Record<string, unknown>) => void;
}) {
  const subject = (data.subject as string) || "";
  const content = (data.content as string) || "";
  const contentType = (data.contentType as EmailContentType) || "markdown";
  const preheader = (data.preheader as string) || "";
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const insertAtCursor = (tag: string) => {
    const el = taRef.current;
    if (!el) {
      set({ content: content + tag });
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + tag + content.slice(end);
    set({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tag.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <>
      <Field label="Subject">
        <Input
          value={subject}
          placeholder="Welcome to MailCast"
          onChange={(e) => set({ subject: e.target.value })}
        />
      </Field>

      <Field label="Content type">
        <Tabs
          value={contentType}
          onValueChange={(v) => set({ contentType: v as EmailContentType })}
        >
          <TabsList className="w-full">
            <TabsTrigger value="markdown" className="flex-1">
              Markdown
            </TabsTrigger>
            <TabsTrigger value="html" className="flex-1">
              HTML
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Field>

      <Field label="Body">
        <Textarea
          ref={taRef}
          value={content}
          rows={8}
          className={cn(contentType === "html" && "font-mono text-xs")}
          placeholder={
            contentType === "html"
              ? "<h1>Hello {{first_name}}</h1>\n<p>Thanks for joining.</p>"
              : "# Hello {{first_name}},\n\nThanks for joining."
          }
          onChange={(e) => set({ content: e.target.value })}
        />
      </Field>

      <MergeTags onPick={insertAtCursor} />

      <Field label="Preheader" hint="Short inbox preview shown after the subject line.">
        <Input
          value={preheader}
          placeholder="A quick note to say hello"
          onChange={(e) => set({ preheader: e.target.value })}
        />
      </Field>
    </>
  );
}

function SendTelegramEditor({
  data,
  set,
}: {
  data: Record<string, unknown>;
  set: (p: Record<string, unknown>) => void;
}) {
  const message = (data.message as string) || "";
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const insertAtCursor = (tag: string) => {
    const el = taRef.current;
    if (!el) {
      set({ message: message + tag });
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + tag + message.slice(end);
    set({ message: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tag.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <>
      <Field label="Message" hint="Markdown-formatted Telegram message.">
        <Textarea
          ref={taRef}
          value={message}
          rows={8}
          placeholder="Hi {{first_name}} — thanks for subscribing."
          onChange={(e) => set({ message: e.target.value })}
        />
      </Field>
      <MergeTags onPick={insertAtCursor} />
      <Note>
        Sent via your Telegram bot. Only delivers if a bot token is configured
        AND the contact has started the bot (so we have their chat id).
        Otherwise skipped.
      </Note>
    </>
  );
}

function WaitEditor({
  data,
  set,
}: {
  data: Record<string, unknown>;
  set: (p: Record<string, unknown>) => void;
}) {
  const amount = Number(data.amount) || 0;
  const unit = (data.unit as WaitUnit) || "days";
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          <Input
            type="number"
            min={1}
            value={amount || ""}
            onChange={(e) => set({ amount: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
        <Field label="Unit">
          <Select value={unit} onValueChange={(v) => set({ unit: v as WaitUnit })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        The contact's progress pauses here until the delay elapses, then the
        next connected step runs.
      </p>
    </>
  );
}

function TagEditor({
  data,
  set,
}: {
  data: Record<string, unknown>;
  set: (p: Record<string, unknown>) => void;
}) {
  const tag = (data.tag as string) || "";
  return (
    <Field label="Tag" hint="Comma-free label added to / removed from the contact.">
      <Input
        value={tag}
        placeholder="e.g. vip"
        onChange={(e) => set({ tag: e.target.value })}
      />
    </Field>
  );
}

function GroupEditor({
  data,
  set,
  groups,
}: {
  data: Record<string, unknown>;
  set: (p: Record<string, unknown>) => void;
  groups: Option[];
}) {
  const groupId = (data.groupId as string) || "";
  return (
    <Field label="Group" hint="The contact is added to / removed from this group.">
      <Select value={groupId} onValueChange={(v) => set({ groupId: v })}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={groups.length === 0 ? "No groups available" : "Pick a group"} />
        </SelectTrigger>
        <SelectContent>
          {groups.length === 0 ? (
            <SelectItem value="_none" disabled>
              No groups yet
            </SelectItem>
          ) : (
            groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </Field>
  );
}

const CONDITION_FIELD_OPTIONS: { value: ConditionField; label: string; needsValue: boolean }[] = [
  { value: "tag", label: "Has tag", needsValue: true },
  { value: "group", label: "In group", needsValue: true },
  { value: "form", label: "Submitted form", needsValue: true },
  { value: "telegram", label: "Has Telegram", needsValue: false },
];

function ConditionEditor({
  data,
  set,
  forms,
  groups,
}: {
  data: Record<string, unknown>;
  set: (p: Record<string, unknown>) => void;
  forms: Option[];
  groups: Option[];
}) {
  const conditions = Array.isArray(data.conditions)
    ? (data.conditions as ConditionItem[])
    : [];
  const logic = (data.logic as ConditionLogic) || "and";

  const setConditions = (next: ConditionItem[]) => set({ conditions: next });
  const addCondition = () =>
    setConditions([...conditions, { field: "tag", value: "" }]);
  const removeCondition = (i: number) =>
    setConditions(conditions.filter((_, idx) => idx !== i));
  const updateCondition = (i: number, partial: Partial<ConditionItem>) =>
    setConditions(
      conditions.map((c, idx) => (idx === i ? { ...c, ...partial } : c)),
    );

  return (
    <>
      <Field label="Match logic">
        <ToggleGroup
          type="single"
          value={logic}
          onValueChange={(v) => v && set({ logic: v as ConditionLogic })}
          variant="outline"
          className="w-full"
        >
          <ToggleGroupItem value="and" className="flex-1">
            ALL (AND)
          </ToggleGroupItem>
          <ToggleGroupItem value="or" className="flex-1">
            ANY (OR)
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-foreground">
            Conditions
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-md px-2 text-xs"
            onClick={addCondition}
          >
            <Plus className="size-3" /> Add
          </Button>
        </div>

        {conditions.length === 0 && (
          <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            No conditions yet — the Yes branch will never be taken.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {conditions.map((c, i) => {
            const opt = CONDITION_FIELD_OPTIONS.find(
              (o) => o.value === c.field,
            ) || CONDITION_FIELD_OPTIONS[0];
            return (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border bg-card p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Select
                    value={c.field}
                    onValueChange={(v) =>
                      updateCondition(i, {
                        field: v as ConditionField,
                        value: "",
                      })
                    }
                  >
                    <SelectTrigger className="h-8 flex-1" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_FIELD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCondition(i)}
                    aria-label="Remove condition"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                {opt.needsValue && c.field === "tag" && (
                  <Input
                    className="h-8"
                    placeholder="Tag name, e.g. vip"
                    value={c.value}
                    onChange={(e) =>
                      updateCondition(i, { value: e.target.value })
                    }
                  />
                )}
                {opt.needsValue && c.field === "group" && (
                  <Select
                    value={c.value}
                    onValueChange={(v) => updateCondition(i, { value: v })}
                  >
                    <SelectTrigger className="h-8 w-full" size="sm">
                      <SelectValue placeholder={groups.length === 0 ? "No groups available" : "Pick a group"} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          No groups yet
                        </SelectItem>
                      ) : (
                        groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                {opt.needsValue && c.field === "form" && (
                  <Select
                    value={c.value}
                    onValueChange={(v) => updateCondition(i, { value: v })}
                  >
                    <SelectTrigger className="h-8 w-full" size="sm">
                      <SelectValue placeholder={forms.length === 0 ? "No forms available" : "Pick a form"} />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          No forms yet
                        </SelectItem>
                      ) : (
                        forms.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                {c.field === "telegram" && (
                  <p className="text-[11px] text-muted-foreground">
                    True when the contact has a Telegram chat id on file.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Note>
        Branches: Yes (match) follows the green handle, No follows the muted
        handle.
      </Note>

      <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <MessageSquare className="size-3.5 mt-0.5 shrink-0" />
        <p className="leading-snug">
          Tip: drag from the small Yes / No dots at the bottom of the condition
          node to wire each branch to a different next step.
        </p>
      </div>
    </>
  );
}
