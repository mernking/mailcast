import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_TRIGGERS = new Set([
  "form_submit",
  "contact_added",
  "contact_tagged",
  "contact_added_to_group",
  "manual",
]);

interface FlowGraph {
  nodes?: unknown[];
  edges?: unknown[];
}

function safeParseGraph(raw: string): FlowGraph {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      };
    }
  } catch {
    // ignore
  }
  return { nodes: [], edges: [] };
}

function safeParseTriggerConfig(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}

/** List all workflows, newest first, with sender info + node count. */
export async function GET() {
  try {
    const workflows = await db.workflow.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { email: true, fromName: true } },
      },
    });

    const items = workflows.map((w) => {
      const graph = safeParseGraph(w.steps);
      return {
        id: w.id,
        name: w.name,
        trigger: w.trigger,
        triggerConfig: safeParseTriggerConfig(w.triggerConfig),
        enabled: w.enabled,
        enrolledCount: w.enrolledCount,
        completedCount: w.completedCount,
        stepCount: graph.nodes?.length || 0,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        sender: w.sender
          ? { email: w.sender.email, fromName: w.sender.fromName }
          : null,
      };
    });

    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load workflows";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Create a new workflow. `steps` is a graph { nodes, edges } (object or JSON string). */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      name,
      trigger,
      triggerConfig,
      senderId,
      steps,
      enabled,
    } = (body ?? {}) as {
      name?: string;
      trigger?: string;
      triggerConfig?: unknown;
      senderId?: string;
      steps?: unknown;
      enabled?: boolean;
    };

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!senderId) {
      return NextResponse.json({ error: "A sender is required" }, { status: 400 });
    }

    const resolvedTrigger = trigger && VALID_TRIGGERS.has(trigger) ? trigger : "manual";

    const sender = await db.senderAccount.findUnique({ where: { id: senderId } });
    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    // Normalize steps to a JSON string of a graph { nodes, edges }.
    let stepsJson = JSON.stringify({ nodes: [], edges: [] });
    if (steps !== undefined) {
      let graphObj: FlowGraph | null = null;
      if (typeof steps === "string") {
        try {
          const parsed = JSON.parse(steps);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            graphObj = parsed as FlowGraph;
          }
        } catch {
          return NextResponse.json(
            { error: "steps must be a JSON-encoded graph object { nodes, edges }" },
            { status: 400 }
          );
        }
      } else if (steps && typeof steps === "object" && !Array.isArray(steps)) {
        graphObj = steps as FlowGraph;
      }
      if (!graphObj) {
        return NextResponse.json(
          { error: "steps must be a graph object { nodes, edges } or JSON string" },
          { status: 400 }
        );
      }
      stepsJson = JSON.stringify({
        nodes: Array.isArray(graphObj.nodes) ? graphObj.nodes : [],
        edges: Array.isArray(graphObj.edges) ? graphObj.edges : [],
      });
    }

    // Normalize triggerConfig.
    let triggerConfigJson = "{}";
    if (triggerConfig !== undefined) {
      if (typeof triggerConfig === "string") {
        try {
          const parsed = JSON.parse(triggerConfig);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            triggerConfigJson = JSON.stringify(parsed);
          }
        } catch {
          return NextResponse.json(
            { error: "triggerConfig must be a JSON-encoded object" },
            { status: 400 }
          );
        }
      } else if (triggerConfig && typeof triggerConfig === "object" && !Array.isArray(triggerConfig)) {
        triggerConfigJson = JSON.stringify(triggerConfig);
      }
    }

    const workflow = await db.workflow.create({
      data: {
        name: name.trim(),
        trigger: resolvedTrigger,
        triggerConfig: triggerConfigJson,
        senderId,
        steps: stepsJson,
        enabled: typeof enabled === "boolean" ? enabled : true,
      },
      include: {
        sender: { select: { email: true, fromName: true } },
      },
    });

    return NextResponse.json(
      {
        id: workflow.id,
        name: workflow.name,
        trigger: workflow.trigger,
        triggerConfig: safeParseTriggerConfig(workflow.triggerConfig),
        senderId: workflow.senderId,
        enabled: workflow.enabled,
        steps: safeParseGraph(workflow.steps),
        enrolledCount: workflow.enrolledCount,
        completedCount: workflow.completedCount,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        sender: workflow.sender
          ? { email: workflow.sender.email, fromName: workflow.sender.fromName }
          : null,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
