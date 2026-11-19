"use client";

/**
 * Custom React Flow node components for the workflow builder.
 *
 * Every node type renders as a small card with an icon + title + a one-line
 * summary. Handles are positioned:
 *   - target (input) on top, for all nodes except `trigger`
 *   - source (output) on the bottom, for single-output nodes
 *   - two source handles (`true` / `false`) on the bottom for `condition`
 *
 * The `nodeTypes` object is exported for registration on <ReactFlow />.
 * Components are wrapped in React.memo to avoid re-renders when other nodes
 * change.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps, type NodeTypes } from "@xyflow/react";

import { cn } from "@/lib/utils";
import {
  NODE_META,
  summarize,
  type FlowNode,
  type NodeType,
} from "./node-types";

// ---------------------------------------------------------------------------
// Shared shell — every node is a styled card with an icon, a title and a
// summary line. The `selected` prop is wired up by React Flow automatically.
// ---------------------------------------------------------------------------

interface NodeShellProps {
  type: NodeType;
  selected?: boolean;
  children?: React.ReactNode;
}

function NodeShell({ type, selected, children }: NodeShellProps) {
  const meta = NODE_META[type];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "w-60 rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow",
        "hover:shadow-md",
        selected && `ring-2 ${meta.ring} border-transparent`,
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-md shrink-0",
            meta.chip,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {meta.label}
          </div>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm text-foreground leading-snug line-clamp-2 break-words">
          {children}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Common handle styling — small warm-colored dots.
// ---------------------------------------------------------------------------

const TARGET_HANDLE_STYLE: React.CSSProperties = {
  width: 12,
  height: 12,
  background: "var(--muted-foreground)",
  border: "2px solid var(--card)",
};

const SOURCE_HANDLE_STYLE: React.CSSProperties = {
  width: 12,
  height: 12,
  background: "var(--foreground)",
  border: "2px solid var(--card)",
};

const TRUE_HANDLE_STYLE: React.CSSProperties = {
  width: 12,
  height: 12,
  background: "oklch(0.65 0.2 145)", // chart-1 green
  border: "2px solid var(--card)",
};

const FALSE_HANDLE_STYLE: React.CSSProperties = {
  width: 12,
  height: 12,
  background: "var(--muted-foreground)",
  border: "2px solid var(--card)",
};

// ---------------------------------------------------------------------------
// Individual node components.
// ---------------------------------------------------------------------------

type FlowNodeProps = NodeProps<FlowNode>;

const TriggerNode = memo(function TriggerNode({ data, selected }: FlowNodeProps) {
  const node: FlowNode = {
    id: "",
    type: "trigger",
    position: { x: 0, y: 0 },
    data,
  };
  return (
    <NodeShell type="trigger" selected={selected}>
      {summarize(node)}
      {/* No target handle — trigger is the entry point. */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={SOURCE_HANDLE_STYLE}
      />
    </NodeShell>
  );
});

const SendEmailNode = memo(function SendEmailNode({
  data,
  selected,
}: FlowNodeProps) {
  return (
    <NodeShell type="sendEmail" selected={selected}>
      {summarize({ id: "", type: "sendEmail", position: { x: 0, y: 0 }, data })}
      <Handle
        type="target"
        position={Position.Top}
        style={TARGET_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={SOURCE_HANDLE_STYLE}
      />
    </NodeShell>
  );
});

const SendTelegramNode = memo(function SendTelegramNode({
  data,
  selected,
}: FlowNodeProps) {
  return (
    <NodeShell type="sendTelegram" selected={selected}>
      {summarize({
        id: "",
        type: "sendTelegram",
        position: { x: 0, y: 0 },
        data,
      })}
      <Handle
        type="target"
        position={Position.Top}
        style={TARGET_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={SOURCE_HANDLE_STYLE}
      />
    </NodeShell>
  );
});

const WaitNode = memo(function WaitNode({ data, selected }: FlowNodeProps) {
  return (
    <NodeShell type="wait" selected={selected}>
      {summarize({ id: "", type: "wait", position: { x: 0, y: 0 }, data })}
      <Handle
        type="target"
        position={Position.Top}
        style={TARGET_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={SOURCE_HANDLE_STYLE}
      />
    </NodeShell>
  );
});

const AddTagNode = memo(function AddTagNode({ data, selected }: FlowNodeProps) {
  return (
    <NodeShell type="addTag" selected={selected}>
      {summarize({ id: "", type: "addTag", position: { x: 0, y: 0 }, data })}
      <Handle
        type="target"
        position={Position.Top}
        style={TARGET_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={SOURCE_HANDLE_STYLE}
      />
    </NodeShell>
  );
});

const RemoveTagNode = memo(function RemoveTagNode({
  data,
  selected,
}: FlowNodeProps) {
  return (
    <NodeShell type="removeTag" selected={selected}>
      {summarize({ id: "", type: "removeTag", position: { x: 0, y: 0 }, data })}
      <Handle
        type="target"
        position={Position.Top}
        style={TARGET_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={SOURCE_HANDLE_STYLE}
      />
    </NodeShell>
  );
});

const AddToGroupNode = memo(function AddToGroupNode({
  data,
  selected,
}: FlowNodeProps) {
  return (
    <NodeShell type="addToGroup" selected={selected}>
      {summarize({ id: "", type: "addToGroup", position: { x: 0, y: 0 }, data })}
      <Handle
        type="target"
        position={Position.Top}
        style={TARGET_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={SOURCE_HANDLE_STYLE}
      />
    </NodeShell>
  );
});

const RemoveFromGroupNode = memo(function RemoveFromGroupNode({
  data,
  selected,
}: FlowNodeProps) {
  return (
    <NodeShell type="removeFromGroup" selected={selected}>
      {summarize({
        id: "",
        type: "removeFromGroup",
        position: { x: 0, y: 0 },
        data,
      })}
      <Handle
        type="target"
        position={Position.Top}
        style={TARGET_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={SOURCE_HANDLE_STYLE}
      />
    </NodeShell>
  );
});

const ConditionNode = memo(function ConditionNode({
  data,
  selected,
}: FlowNodeProps) {
  return (
    <div className="relative">
      <NodeShell type="condition" selected={selected}>
        {summarize({ id: "", type: "condition", position: { x: 0, y: 0 }, data })}
      </NodeShell>
      <Handle
        type="target"
        position={Position.Top}
        style={TARGET_HANDLE_STYLE}
      />
      {/* Two output handles at the bottom: "true" (Yes) on the left, "false"
          (No) on the right. Both labeled inline so the user knows which is
          which when dragging a connection. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-8 pb-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
          Yes
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          No
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ ...TRUE_HANDLE_STYLE, left: "25%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ ...FALSE_HANDLE_STYLE, left: "75%" }}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration map for <ReactFlow nodeTypes={...} />.
// ---------------------------------------------------------------------------

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  sendEmail: SendEmailNode,
  sendTelegram: SendTelegramNode,
  wait: WaitNode,
  addTag: AddTagNode,
  removeTag: RemoveTagNode,
  addToGroup: AddToGroupNode,
  removeFromGroup: RemoveFromGroupNode,
  condition: ConditionNode,
};
