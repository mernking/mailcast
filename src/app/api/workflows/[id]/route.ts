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

/**
 * GET /api/workflows/[id] — full workflow detail with parsed steps + recent enrollments.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        sender: { select: { email: true, fromName: true } },
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            contact: { select: { email: true } },
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const [activeCount, enrolledCount, completedCount] = await Promise.all([
      db.automationEnrollment.count({
        where: { workflowId: id, status: "active" },
      }),
      db.automationEnrollment.count({
        where: { workflowId: id },
      }),
      db.automationEnrollment.count({
        where: { workflowId: id, status: "completed" },
      }),
    ]);

    const recent = workflow.enrollments.map((en) => ({
      contactEmail: en.contact?.email ?? "(missing)",
      status: en.status,
      currentNodeId: en.currentNodeId,
      dueAt: en.dueAt,
      error: en.error,
    }));

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger,
      triggerConfig: safeParseTriggerConfig(workflow.triggerConfig),
      senderId: workflow.senderId,
      enabled: workflow.enabled,
      steps: safeParseGraph(workflow.steps),
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      sender: workflow.sender
        ? { email: workflow.sender.email, fromName: workflow.sender.fromName }
        : null,
      enrolledCount,
      activeCount,
      completedCount,
      recent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/workflows/[id] — update name, trigger, triggerConfig, senderId, steps, enabled.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const patch = (body ?? {}) as {
      name?: string;
      trigger?: string;
      triggerConfig?: unknown;
      senderId?: string;
      steps?: unknown;
      enabled?: boolean;
    };

    const data: Record<string, unknown> = {};

    if (typeof patch.name === "string") {
      if (patch.name.trim().length === 0) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      data.name = patch.name.trim();
    }

    if (typeof patch.trigger === "string") {
      if (!VALID_TRIGGERS.has(patch.trigger)) {
        return NextResponse.json(
          { error: "Invalid trigger type" },
          { status: 400 }
        );
      }
      data.trigger = patch.trigger;
    }

    if (patch.triggerConfig !== undefined) {
      if (typeof patch.triggerConfig === "string") {
        try {
          const parsed = JSON.parse(patch.triggerConfig);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            data.triggerConfig = JSON.stringify(parsed);
          } else {
            return NextResponse.json(
              { error: "triggerConfig must be a JSON-encoded object" },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "triggerConfig must be a JSON-encoded object" },
            { status: 400 }
          );
        }
      } else if (
        patch.triggerConfig &&
        typeof patch.triggerConfig === "object" &&
        !Array.isArray(patch.triggerConfig)
      ) {
        data.triggerConfig = JSON.stringify(patch.triggerConfig);
      } else if (patch.triggerConfig === null) {
        data.triggerConfig = "{}";
      } else {
        return NextResponse.json(
          { error: "triggerConfig must be an object or JSON string" },
          { status: 400 }
        );
      }
    }

    if (typeof patch.senderId === "string" && patch.senderId) {
      const sender = await db.senderAccount.findUnique({
        where: { id: patch.senderId },
      });
      if (!sender) {
        return NextResponse.json({ error: "Sender not found" }, { status: 404 });
      }
      data.senderId = patch.senderId;
    }

    if (patch.steps !== undefined) {
      let graphObj: FlowGraph | null = null;
      if (typeof patch.steps === "string") {
        try {
          const parsed = JSON.parse(patch.steps);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            graphObj = parsed as FlowGraph;
          }
        } catch {
          return NextResponse.json(
            { error: "steps must be a JSON-encoded graph object { nodes, edges }" },
            { status: 400 }
          );
        }
      } else if (patch.steps && typeof patch.steps === "object" && !Array.isArray(patch.steps)) {
        graphObj = patch.steps as FlowGraph;
      }
      if (!graphObj) {
        return NextResponse.json(
          { error: "steps must be a graph object { nodes, edges } or JSON string" },
          { status: 400 }
        );
      }
      data.steps = JSON.stringify({
        nodes: Array.isArray(graphObj.nodes) ? graphObj.nodes : [],
        edges: Array.isArray(graphObj.edges) ? graphObj.edges : [],
      });
    }

    if (typeof patch.enabled === "boolean") {
      data.enabled = patch.enabled;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.workflow.update({
      where: { id },
      data,
      include: {
        sender: { select: { email: true, fromName: true } },
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            contact: { select: { email: true } },
          },
        },
      },
    });

    const [activeCount, enrolledCount, completedCount] = await Promise.all([
      db.automationEnrollment.count({
        where: { workflowId: id, status: "active" },
      }),
      db.automationEnrollment.count({
        where: { workflowId: id },
      }),
      db.automationEnrollment.count({
        where: { workflowId: id, status: "completed" },
      }),
    ]);

    const recent = updated.enrollments.map((en) => ({
      contactEmail: en.contact?.email ?? "(missing)",
      status: en.status,
      currentNodeId: en.currentNodeId,
      dueAt: en.dueAt,
      error: en.error,
    }));

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      trigger: updated.trigger,
      triggerConfig: safeParseTriggerConfig(updated.triggerConfig),
      senderId: updated.senderId,
      enabled: updated.enabled,
      steps: safeParseGraph(updated.steps),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      sender: updated.sender
        ? { email: updated.sender.email, fromName: updated.sender.fromName }
        : null,
      enrolledCount,
      activeCount,
      completedCount,
      recent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/workflows/[id] — cascades enrollments.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.workflow.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete workflow";
    if (/P2025|not found|no record/i.test(message)) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
