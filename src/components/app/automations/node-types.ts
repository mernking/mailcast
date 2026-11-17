"use client";

/**
 * Shared node-type definitions for the visual workflow builder.
 *
 * A workflow's `steps` field stores a React Flow graph:
 *   { nodes: [{ id, type, position, data }], edges: [{ id, source, target, sourceHandle? }] }
 *
 * This module centralizes:
 *   - the set of node `type` strings
 *   - default `data` factory for each type (so newly added nodes are always valid)
 *   - the icon + human label for each type (used by palette + node cards)
 *   - trigger-type metadata (labels + whether extra config is required)
 *   - a `summarize` helper that produces the one-line description shown on each node card
 *   - the warm, earthy color tokens used by node cards (NO saturated blue/indigo)
 */

import type { LucideIcon } from "lucide-react";
import {
  Zap,
  Mail,
  Send,
  Clock,
  Tag,
  MinusCircle,
  Users,
  UserMinus,
  GitBranch,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Node + edge types (mirror what the automation engine in src/lib/automation
// reads; keep these in sync with that file).
// ---------------------------------------------------------------------------

export type WorkflowTrigger =
  | "form_submit"
  | "contact_added"
  | "contact_tagged"
  | "contact_added_to_group"
  | "manual";

export type NodeType =
  | "trigger"
  | "sendEmail"
  | "sendTelegram"
  | "wait"
  | "addTag"
  | "removeTag"
  | "addToGroup"
  | "removeFromGroup"
  | "condition";

export type EmailContentType = "markdown" | "html";
export type WaitUnit = "minutes" | "hours" | "days";
export type ConditionLogic = "and" | "or";
export type ConditionField = "tag" | "group" | "form" | "telegram";

/** Default shape of a trigger node's `data`. */
export interface TriggerData {
  triggerType: WorkflowTrigger;
  config: { formId?: string; tag?: string; groupId?: string };
}

export interface SendEmailData {
  subject: string;
  content: string;
  contentType: EmailContentType;
  preheader?: string;
}

export interface SendTelegramData {
  message: string;
}

export interface WaitData {
  amount: number;
  unit: WaitUnit;
}

export interface TagData {
  tag: string;
}

export interface GroupData {
  groupId: string;
}

export interface ConditionItem {
  field: ConditionField;
  op?: string;
  value: string;
}

export interface ConditionData {
  conditions: ConditionItem[];
  logic: ConditionLogic;
}

/** Loose union used by the React Flow node `data` slot. */
export type AnyNodeData =
  | TriggerData
  | SendEmailData
  | SendTelegramData
  | WaitData
  | TagData
  | GroupData
  | ConditionData
  | Record<string, unknown>;

/** Shape of a node stored in `steps.nodes`. */
export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: AnyNodeData;
  selected?: boolean;
}

/** Shape of an edge stored in `steps.edges`. */
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  /** "true" | "false" for condition nodes; undefined for single-output nodes. */
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// ---------------------------------------------------------------------------
// Metadata: icon + label per node type + trigger.
// ---------------------------------------------------------------------------

export interface NodeMeta {
  type: NodeType;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip on the node card. */
  chip: string;
  /** Tailwind classes applied to the card border when selected. */
  ring: string;
  /** True for nodes that have an incoming (target) handle. */
  hasInput: boolean;
  /** True for nodes with two outputs (true/false). */
  hasBranch: boolean;
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  trigger: {
    type: "trigger",
    label: "Trigger",
    icon: Zap,
    chip: "bg-amber-100 text-amber-800",
    ring: "ring-amber-400/60",
    hasInput: false,
    hasBranch: false,
  },
  sendEmail: {
    type: "sendEmail",
    label: "Send email",
    icon: Mail,
    chip: "bg-emerald-100 text-emerald-800",
    ring: "ring-emerald-400/60",
    hasInput: true,
    hasBranch: false,
  },
  sendTelegram: {
    type: "sendTelegram",
    label: "Send Telegram",
    icon: Send,
    chip: "bg-slate-200 text-slate-800",
    ring: "ring-slate-400/60",
    hasInput: true,
    hasBranch: false,
  },
  wait: {
    type: "wait",
    label: "Wait",
    icon: Clock,
    chip: "bg-stone-200 text-stone-800",
    ring: "ring-stone-400/60",
    hasInput: true,
    hasBranch: false,
  },
  addTag: {
    type: "addTag",
    label: "Add tag",
    icon: Tag,
    chip: "bg-teal-100 text-teal-800",
    ring: "ring-teal-400/60",
    hasInput: true,
    hasBranch: false,
  },
  removeTag: {
    type: "removeTag",
    label: "Remove tag",
    icon: MinusCircle,
    chip: "bg-orange-100 text-orange-800",
    ring: "ring-orange-400/60",
    hasInput: true,
    hasBranch: false,
  },
  addToGroup: {
    type: "addToGroup",
    label: "Add to group",
    icon: Users,
    chip: "bg-purple-100 text-purple-800",
    ring: "ring-purple-400/60",
    hasInput: true,
    hasBranch: false,
  },
  removeFromGroup: {
    type: "removeFromGroup",
    label: "Remove from group",
    icon: UserMinus,
    chip: "bg-fuchsia-100 text-fuchsia-800",
    ring: "ring-fuchsia-400/60",
    hasInput: true,
    hasBranch: false,
  },
  condition: {
    type: "condition",
    label: "Condition",
    icon: GitBranch,
    chip: "bg-rose-100 text-rose-800",
    ring: "ring-rose-400/60",
    hasInput: true,
    hasBranch: true,
  },
};

/** Node types the user can add via the palette (trigger excluded — only one). */
export const PALETTE_NODE_TYPES: NodeType[] = [
  "sendEmail",
  "sendTelegram",
  "wait",
  "addTag",
  "removeTag",
  "addToGroup",
  "removeFromGroup",
  "condition",
];

// ---------------------------------------------------------------------------
// Trigger metadata (used by both the trigger node summary and the property
// panel's trigger-type select).
// ---------------------------------------------------------------------------

export interface TriggerMeta {
  value: WorkflowTrigger;
  label: string;
  /** Whether the trigger's config requires an extra value (form / tag / group). */
  needs: "none" | "form" | "tag" | "group";
}

export const TRIGGER_META: Record<WorkflowTrigger, TriggerMeta> = {
  form_submit: { value: "form_submit", label: "Form submitted", needs: "form" },
  contact_added: { value: "contact_added", label: "New contact", needs: "none" },
  contact_tagged: { value: "contact_tagged", label: "Contact tagged", needs: "tag" },
  contact_added_to_group: {
    value: "contact_added_to_group",
    label: "Added to group",
    needs: "group",
  },
  manual: { value: "manual", label: "Manual", needs: "none" },
};

export const TRIGGER_OPTIONS: TriggerMeta[] = [
  TRIGGER_META.form_submit,
  TRIGGER_META.contact_added,
  TRIGGER_META.contact_tagged,
  TRIGGER_META.contact_added_to_group,
  TRIGGER_META.manual,
];

// ---------------------------------------------------------------------------
// Defaults for newly added nodes.
// ---------------------------------------------------------------------------

/** Generate a unique node/edge id. Prefers crypto.randomUUID when available. */
export function genId(prefix = "n"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rand}`;
}

/** Default `data` for a freshly created node of the given type. */
export function defaultDataFor(type: NodeType): AnyNodeData {
  switch (type) {
    case "trigger":
      return {
        triggerType: "manual",
        config: {},
      } satisfies TriggerData;
    case "sendEmail":
      return {
        subject: "",
        content: "",
        contentType: "markdown",
        preheader: "",
      } satisfies SendEmailData;
    case "sendTelegram":
      return { message: "" } satisfies SendTelegramData;
    case "wait":
      return { amount: 1, unit: "days" } satisfies WaitData;
    case "addTag":
    case "removeTag":
      return { tag: "" } satisfies TagData;
    case "addToGroup":
    case "removeFromGroup":
      return { groupId: "" } satisfies GroupData;
    case "condition":
      return {
        conditions: [{ field: "tag", value: "" }],
        logic: "and",
      } satisfies ConditionData;
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Summarize — produce the one-line description shown on each node card.
// ---------------------------------------------------------------------------

export function summarize(node: FlowNode): string {
  const d = node.data as Record<string, unknown>;
  switch (node.type) {
    case "trigger": {
      const tt = (d.triggerType as WorkflowTrigger) || "manual";
      const cfg = (d.config as Record<string, unknown> | undefined) || {};
      const meta = TRIGGER_META[tt];
      if (tt === "form_submit" && cfg.formId) return `When form submitted`;
      if (tt === "contact_tagged" && cfg.tag) return `When tagged "${cfg.tag}"`;
      if (tt === "contact_added_to_group") return `When added to a group`;
      return `When ${meta?.label.toLowerCase() || "triggered"}`;
    }
    case "sendEmail":
      return d.subject ? `Send: ${String(d.subject)}` : "Send email";
    case "sendTelegram":
      return d.message
        ? `Telegram: ${firstLine(String(d.message))}`
        : "Send Telegram message";
    case "wait": {
      const amount = Number(d.amount) || 0;
      const unit = (d.unit as WaitUnit) || "days";
      if (!amount) return "Wait";
      return `Wait ${amount} ${unit === "days" ? "day" : unit === "hours" ? "hour" : "minute"}${amount === 1 ? "" : "s"}`;
    }
    case "addTag":
      return d.tag ? `Add tag "${d.tag}"` : "Add tag";
    case "removeTag":
      return d.tag ? `Remove tag "${d.tag}"` : "Remove tag";
    case "addToGroup":
      return "Add to group";
    case "removeFromGroup":
      return "Remove from group";
    case "condition": {
      const items = Array.isArray(d.conditions) ? d.conditions : [];
      const n = items.length;
      if (n === 0) return "If (no conditions)";
      const logic = d.logic === "or" ? " OR " : " AND ";
      const parts = items
        .map((it) => {
          const c = it as ConditionItem;
          const f =
            c.field === "tag"
              ? "Has tag"
              : c.field === "group"
                ? "In group"
                : c.field === "form"
                  ? "Submitted form"
                  : "Has Telegram";
          return c.value ? `${f} ${c.value}` : f;
        })
        .join(logic);
      return `If ${parts}`;
    }
    default:
      return "";
  }
}

function firstLine(s: string): string {
  const line = s.split(/\r?\n/, 1)[0] || "";
  return line.length > 30 ? line.slice(0, 29) + "…" : line;
}
