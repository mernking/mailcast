"use client";

/**
 * Visual workflow builder using @xyflow/react (React Flow v13).
 *
 * Layout
 *   - Top bar: back button, inline name input, sender select, enabled switch,
 *     save button.
 *   - Main: React Flow canvas (left, flex-1) + right property panel (w-80 /
 *     w-96). On small screens the panel stacks below the canvas.
 *
 * State
 *   - nodes / edges are managed with useNodesState / useEdgesState.
 *   - The selected node id is tracked locally; the property panel reads the
 *     full node object from `nodes` so any edit re-renders both the panel and
 *     the on-canvas summary.
 *   - On save we serialize the graph + the denormalized trigger / triggerConfig
 *     and POST (new) or PATCH (existing) `/api/workflows/[id]`.
 */

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeTypes,
  type OnConnect,
} from "@xyflow/react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useFetch, apiFetch } from "../use-api";
import { nodeTypes as flowNodeTypes } from "./flow-nodes";
import { PropertyPanel, type Option } from "./property-panel";
import {
  defaultDataFor,
  genId,
  type AnyNodeData,
  type FlowGraph,
  type FlowNode,
  type NodeType,
  type TriggerData,
  type WorkflowTrigger,
} from "./node-types";

// ---------------------------------------------------------------------------
// Sender + form + group option types (fetched separately for selects).
// ---------------------------------------------------------------------------

interface Sender {
  id: string;
  email: string;
  fromName: string;
  verified: boolean;
}
interface Form {
  id: string;
  name: string;
}
interface Group {
  id: string;
  name: string;
}

interface WorkflowDetail {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  triggerConfig: { formId?: string; tag?: string; groupId?: string };
  senderId: string;
  enabled: boolean;
  steps: FlowGraph;
}

// ---------------------------------------------------------------------------
// Public component.
// ---------------------------------------------------------------------------

export function WorkflowBuilder({
  workflowId,
  onSaved,
  onClose,
}: {
  workflowId: string | null;
  onSaved?: () => void;
  onClose?: () => void;
}) {
  const isNew = workflowId === "new";

  return (
    <ReactFlowProvider>
      <BuilderInner
        workflowId={isNew ? null : workflowId}
        isNew={isNew}
        onSaved={onSaved}
        onClose={onClose}
      />
    </ReactFlowProvider>
  );
}

// ---------------------------------------------------------------------------
// Inner component — wraps everything that needs the React Flow context.
// ---------------------------------------------------------------------------

function BuilderInner({
  workflowId,
  isNew,
  onSaved,
  onClose,
}: {
  workflowId: string | null;
  isNew: boolean;
  onSaved?: () => void;
  onClose?: () => void;
}) {
  // Workflow name + sender + enabled (top-bar state).
  const [name, setName] = useState<string>(isNew ? "Untitled workflow" : "");
  const [senderId, setSenderId] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(isNew);

  // Nodes + edges state for the canvas.
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Selected node id (drives the right-side panel).
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reactFlow = useReactFlow();

  // ----- Load existing workflow on mount ----------------------------------

  const { data: wfData } = useFetch<WorkflowDetail | null>(
    isNew ? null : workflowId ? `/api/workflows/${workflowId}` : null,
  );

  useEffect(() => {
    if (isNew) {
      // For a new workflow, seed with a single trigger node centered.
      const trigId = genId("node");
      const seed: FlowNode[] = [
        {
          id: trigId,
          type: "trigger",
          position: { x: 0, y: 0 },
          data: defaultDataFor("trigger"),
          selected: true,
        },
      ];
      setNodes(seed);
      setSelectedId(trigId);
      setHydrated(true);
      return;
    }
  }, [isNew, setNodes]);

  useEffect(() => {
    if (!wfData || isNew) return;
    setName(wfData.name);
    setSenderId(wfData.senderId);
    setEnabled(wfData.enabled);
    const graph = wfData.steps || { nodes: [], edges: [] };
    // Ensure a trigger node exists; if missing, add one.
    let nextNodes = (graph.nodes || []).filter(Boolean) as FlowNode[];
    const hasTrigger = nextNodes.some((n) => n.type === "trigger");
    if (!hasTrigger) {
      const trigId = genId("node");
      nextNodes = [
        {
          id: trigId,
          type: "trigger",
          position: { x: 0, y: 0 },
          data: defaultDataFor("trigger"),
        },
        ...nextNodes,
      ];
    }
    // Normalize data — every node gets a fresh `data` if missing.
    nextNodes = nextNodes.map((n) => ({
      ...n,
      data: (n.data || defaultDataFor(n.type)) as AnyNodeData,
      // Type-cast to satisfy React Flow's Node<FlowNode> shape.
    })) as FlowNode[];
    const nextEdges = (graph.edges || []).filter(Boolean) as unknown as Edge[];
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedId(null);
    setHydrated(true);
    // Fit view once nodes have been measured.
    requestAnimationFrame(() => {
      reactFlow.fitView({ padding: 0.2, duration: 200 });
    });
  }, [wfData, isNew, setNodes, setEdges, reactFlow]);

  // ----- Option fetches for selects --------------------------------------

  const { data: senders } = useFetch<Sender[]>("/api/senders");
  const { data: forms } = useFetch<Form[]>("/api/forms");
  const { data: groups } = useFetch<Group[] | { error: string }>(
    "/api/groups",
  );

  const formOptions: Option[] = useMemo(
    () => (forms || []).map((f) => ({ id: f.id, name: f.name })),
    [forms],
  );
  const groupOptions: Option[] = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return [];
    return (groups as Group[]).map((g) => ({ id: g.id, name: g.name }));
  }, [groups]);
  const senderOptions = senders || [];

  // ----- Derived: has trigger? selected node? ----------------------------

  const hasTrigger = useMemo(
    () => nodes.some((n) => n.type === "trigger"),
    [nodes],
  );
  const selectedNode = useMemo(
    () => (selectedId ? (nodes.find((n) => n.id === selectedId) || null) : null),
    [nodes, selectedId],
  );

  // ----- Node + edge mutation callbacks ----------------------------------

  const updateNodeData = useCallback(
    (id: string, partial: Record<string, unknown>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, ...partial } as AnyNodeData }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const addNode = useCallback(
    (type: NodeType) => {
      // Place the new node below the bottom-most node, or at origin.
      const id = genId("node");
      const ys = nodes.map((n) => n.position?.y ?? 0);
      const xs = nodes.map((n) => n.position?.x ?? 0);
      const baseY = ys.length ? Math.max(...ys) : 0;
      const baseX = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
      const offset = 160;
      const newNode: FlowNode = {
        id,
        type,
        position: { x: baseX + (Math.random() * 80 - 40), y: baseY + offset },
        data: defaultDataFor(type),
        selected: true,
      };
      setNodes((prev) =>
        [...prev.map((n) => ({ ...n, selected: false })), newNode] as FlowNode[],
      );
      setSelectedId(id);
    },
    [nodes, setNodes],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) =>
        prev.filter((e) => e.source !== id && e.target !== id),
      );
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [setNodes, setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      // Build an edge id that encodes the source handle so the engine can
      // resolve the right branch for condition nodes.
      const id = genId("edge");
      const newEdge: Edge = {
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: "smoothstep",
        // For condition true/false branches, color the edge so the user can
        // see at a glance which branch is which.
        ...(connection.sourceHandle === "true"
          ? {
              style: { stroke: "oklch(0.65 0.2 145)", strokeWidth: 2 },
            }
          : connection.sourceHandle === "false"
            ? {
                style: { stroke: "var(--muted-foreground)", strokeWidth: 2, strokeDasharray: "4 4" },
              }
            : { style: { stroke: "var(--foreground)", strokeWidth: 2 } }),
      };
      setEdges((prev) =>
        addEdge(newEdge, prev.filter((e) => e.id !== newEdge.id)),
      );
    },
    [setEdges],
  );

  // Clicking a node selects it; clicking the pane clears the selection.
  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: FlowNode) => {
      setSelectedId(node.id);
      setNodes((prev) =>
        prev.map((n) => ({ ...n, selected: n.id === node.id })) as FlowNode[],
      );
    },
    [setNodes],
  );
  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    setNodes((prev) =>
      prev.map((n) => ({ ...n, selected: false })) as FlowNode[],
    );
  }, [setNodes]);

  // ----- Save -------------------------------------------------------------

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!senderId) {
      toast.error("Choose a sender");
      return;
    }
    setSaving(true);
    try {
      // Find trigger node + derive denormalized trigger fields.
      const trigNode = nodes.find((n) => n.type === "trigger");
      let trigger: WorkflowTrigger = "manual";
      let triggerConfig: { formId?: string; tag?: string; groupId?: string } =
        {};
      if (trigNode) {
        const td = trigNode.data as TriggerData;
        trigger = td.triggerType || "manual";
        triggerConfig = td.config || {};
      }

      const graph: FlowGraph = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          targetHandle: e.targetHandle ?? undefined,
        })),
      };

      const payload = {
        name: name.trim(),
        trigger,
        triggerConfig,
        senderId,
        steps: graph,
        enabled,
      };

      if (isNew) {
        const created = await apiFetch<{ id: string }>("/api/workflows", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Workflow created");
        onSaved?.();
        onClose?.();
        void created;
      } else if (workflowId) {
        await apiFetch(`/api/workflows/${workflowId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Workflow saved");
        onSaved?.();
        onClose?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  // ----- Render -----------------------------------------------------------

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-3">
      <TopBar
        name={name}
        onName={setName}
        senderId={senderId}
        onSenderId={setSenderId}
        senders={senderOptions}
        enabled={enabled}
        onEnabled={setEnabled}
        saving={saving}
        onSave={handleSave}
        onClose={onClose}
        isNew={isNew}
      />

      <div className="flex flex-1 flex-col-reverse md:flex-row gap-3 min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-h-[400px] rounded-xl border bg-card overflow-hidden relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={flowNodeTypes as unknown as NodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.4}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: "smoothstep" }}
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-background"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="var(--border)"
            />
            <MiniMap
              pannable
              zoomable
              className="!bg-card !border"
              maskColor="rgba(0,0,0,0.04)"
              nodeColor={(n) => miniColorFor(n.type as NodeType)}
              nodeStrokeWidth={2}
            />
            <Controls className="!bg-card !border !rounded-md !shadow-sm" />
            <Panel position="top-left" className="!m-2">
              <MobileHint />
            </Panel>
          </ReactFlow>
        </div>

        {/* Right panel */}
        <div className="w-full md:w-96 shrink-0 rounded-xl border bg-card overflow-hidden min-h-[300px] md:min-h-0">
          <PropertyPanel
            selectedNode={selectedNode}
            forms={formOptions}
            groups={groupOptions}
            updateNodeData={updateNodeData}
            onDeleteNode={deleteNode}
            onAddNode={addNode}
            hasTrigger={hasTrigger}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top bar.
// ---------------------------------------------------------------------------

function TopBar({
  name,
  onName,
  senderId,
  onSenderId,
  senders,
  enabled,
  onEnabled,
  saving,
  onSave,
  onClose,
  isNew,
}: {
  name: string;
  onName: (v: string) => void;
  senderId: string;
  onSenderId: (v: string) => void;
  senders: Sender[];
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onClose?: () => void;
  isNew: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full shrink-0 text-muted-foreground"
          onClick={onClose}
        >
          <ArrowLeft className="size-4" /> All workflows
        </Button>
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Workflow name"
          className="h-8 max-w-xs border-transparent bg-transparent focus-visible:border-input px-2"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Send className="size-3.5 text-muted-foreground" />
          <Select value={senderId} onValueChange={onSenderId}>
            <SelectTrigger size="sm" className="h-8 w-48">
              <SelectValue
                placeholder={
                  senders.length === 0 ? "No senders" : "Pick sender"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {senders.length === 0 ? (
                <SelectItem value="_none" disabled>
                  Add a sender first
                </SelectItem>
              ) : (
                senders.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fromName} — {s.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {enabled ? "Enabled" : "Paused"}
          </span>
          <Switch checked={enabled} onCheckedChange={onEnabled} aria-label="Toggle workflow enabled" />
        </div>

        <Button onClick={onSave} disabled={saving} className="rounded-full">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {isNew ? "Create workflow" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function MobileHint() {
  return (
    <div className="md:hidden rounded-md border bg-card/95 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
      Best viewed on a larger screen
    </div>
  );
}

/** Pick a warm tone for each node type for the minimap. */
function miniColorFor(type: NodeType): string {
  switch (type) {
    case "trigger":
      return "oklch(0.78 0.18 80)"; // amber
    case "sendEmail":
      return "oklch(0.65 0.2 145)"; // green
    case "sendTelegram":
      return "oklch(0.6 0.04 250)"; // slate
    case "wait":
      return "oklch(0.7 0.01 85)"; // stone
    case "addTag":
      return "oklch(0.6 0.15 180)"; // teal
    case "removeTag":
      return "oklch(0.7 0.18 50)"; // orange
    case "addToGroup":
      return "oklch(0.6 0.18 320)"; // muted purple
    case "removeFromGroup":
      return "oklch(0.65 0.2 0)"; // muted rose
    case "condition":
      return "oklch(0.7 0.2 25)"; // rose
    default:
      return "oklch(0.7 0.01 85)";
  }
}
