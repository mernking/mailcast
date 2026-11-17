import { db } from "./db";
import { sendCampaignEmail } from "./gmail";
import { sendTelegramMessage } from "./telegram";
import type { EmailContentType } from "./email-template";

/**
 * Graph-based automation engine.
 *
 * A workflow's `steps` field stores a React Flow graph:
 *   { nodes: [{ id, type, position, data }], edges: [{ id, source, target, sourceHandle? }] }
 *
 * Execution starts at the trigger node and walks the graph. Action nodes run
 * and advance along their single outgoing edge. Condition nodes evaluate and
 * follow either the "true" or "false" handle. Wait nodes set a future dueAt
 * and pause. When a node has no outgoing edge, the enrollment completes.
 */

export type WorkflowTrigger =
  | "form_submit"
  | "contact_added"
  | "contact_tagged"
  | "contact_added_to_group"
  | "manual";

// --- Graph types (mirror the React Flow node shapes stored in `steps`) ---

interface FlowPosition {
  x: number;
  y: number;
}

interface TriggerData {
  triggerType: WorkflowTrigger;
  config: { formId?: string; tag?: string; groupId?: string };
}

interface SendEmailData {
  subject: string;
  content: string;
  contentType: EmailContentType;
  preheader?: string;
}

interface SendTelegramData {
  message: string;
}

interface WaitData {
  amount: number;
  unit: "minutes" | "hours" | "days";
}

interface TagData {
  tag: string;
}

interface GroupData {
  groupId: string;
}

interface ConditionItem {
  /** "tag" | "group" | "form" | "telegram" */
  field: string;
  /** reserved for future ops; currently "equals"/"has" */
  op?: string;
  value: string;
}

interface ConditionData {
  conditions: ConditionItem[];
  /** "and" (all must match) | "or" (any matches) */
  logic: "and" | "or";
}

type NodeData =
  | TriggerData
  | SendEmailData
  | SendTelegramData
  | WaitData
  | TagData
  | GroupData
  | ConditionData
  | Record<string, unknown>;

interface FlowNode {
  id: string;
  type: string;
  position: FlowPosition;
  data: NodeData;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  /** "true" | "false" for condition nodes; undefined for single-output nodes. */
  sourceHandle?: string;
}

interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function addDelay(from: Date, amount: number, unit: WaitData["unit"]): Date {
  const n = Math.max(1, Number(amount) || 1);
  const ms =
    unit === "minutes"
      ? n * 60_000
      : unit === "hours"
        ? n * 3_600_000
        : n * 86_400_000;
  return new Date(from.getTime() + ms);
}

function parseGraph(stepsJson: string): FlowGraph {
  try {
    const parsed = JSON.parse(stepsJson || "{}");
    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return parsed as FlowGraph;
    }
  } catch {
    /* fall through */
  }
  return { nodes: [], edges: [] };
}

function findTrigger(graph: FlowGraph): FlowNode | undefined {
  return graph.nodes.find((n) => n.type === "trigger");
}

function nextNodeId(
  graph: FlowGraph,
  fromId: string,
  handle?: string
): string | null {
  const edge = graph.edges.find(
    (e) => e.source === fromId && (handle ? e.sourceHandle === handle : !e.sourceHandle || e.sourceHandle === "out" || e.sourceHandle === undefined)
  );
  return edge ? edge.target : null;
}

/**
 * Enroll a contact into every enabled workflow whose trigger matches.
 * Context carries the triggering detail (formId / tag / groupId).
 * Returns the number of new enrollments created.
 */
export async function enrollContact(
  contactId: string,
  trigger: WorkflowTrigger,
  context: { formId?: string; tag?: string; groupId?: string } = {}
): Promise<number> {
  const workflows = await db.workflow.findMany({
    where: { enabled: true, trigger },
  });

  let created = 0;
  for (const wf of workflows) {
    let cfg: { formId?: string; tag?: string; groupId?: string } = {};
    try {
      cfg = JSON.parse(wf.triggerConfig || "{}");
    } catch {
      cfg = {};
    }
    if (trigger === "form_submit" && context.formId && cfg.formId && cfg.formId !== context.formId) continue;
    if (trigger === "contact_tagged" && context.tag && cfg.tag && cfg.tag !== context.tag) continue;
    if (trigger === "contact_added_to_group" && context.groupId && cfg.groupId && cfg.groupId !== context.groupId) continue;

    // Avoid duplicate enrollment.
    const existing = await db.automationEnrollment.findFirst({
      where: { workflowId: wf.id, contactId },
      select: { id: true },
    });
    if (existing) continue;

    const graph = parseGraph(wf.steps);
    const trig = findTrigger(graph);
    const startId = trig ? nextNodeId(graph, trig.id) : null;

    // No downstream node — complete immediately (no-op workflow).
    const immediateComplete = !startId;

    await db.automationEnrollment.create({
      data: {
        workflowId: wf.id,
        contactId,
        currentNodeId: startId || "",
        status: immediateComplete ? "completed" : "active",
        dueAt: new Date(),
      },
    });
    await db.workflow.update({
      where: { id: wf.id },
      data: { enrolledCount: { increment: 1 }, completedCount: immediateComplete ? { increment: 1 } : undefined },
    });
    created++;
  }
  return created;
}

interface EnrollmentWithRelations {
  id: string;
  currentNodeId: string;
  status: string;
  workflowId: string;
  workflow: {
    id: string;
    senderId: string;
    steps: string;
    sender: {
      email: string;
      fromName: string;
      passwordEnc: string;
    } | null;
  };
  contact: {
    id: string;
    email: string;
    name: string | null;
    tags: string;
    telegram: string | null;
    telegramChatId: string | null;
  } | null;
}

async function contactHasTag(tags: string, tag: string): Promise<boolean> {
  const list = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  return list.includes(tag);
}

async function contactInGroup(contactId: string, groupId: string): Promise<boolean> {
  const row = await db.contactGroupAssignment.findUnique({
    where: { contactId_groupId: { contactId, groupId } },
    select: { id: true },
  });
  return !!row;
}

async function contactSubmittedForm(contactId: string, formId: string): Promise<boolean> {
  const row = await db.formSubmission.findFirst({
    where: { contactId, formId },
    select: { id: true },
  });
  return !!row;
}

async function evaluateCondition(
  data: ConditionData,
  contact: EnrollmentWithRelations["contact"]
): Promise<boolean> {
  if (!contact) return false;
  const results: boolean[] = [];
  for (const c of data.conditions || []) {
    let met = false;
    if (c.field === "tag") {
      met = await contactHasTag(contact.tags, c.value);
    } else if (c.field === "group") {
      met = await contactInGroup(contact.id, c.value);
    } else if (c.field === "form") {
      met = await contactSubmittedForm(contact.id, c.value);
    } else if (c.field === "telegram") {
      met = !!(contact.telegramChatId || contact.telegram);
    }
    results.push(met);
  }
  if (results.length === 0) return false;
  return data.logic === "or" ? results.some(Boolean) : results.every(Boolean);
}

/** Execute nodes starting from the enrollment's currentNodeId until a wait or end. */
async function processEnrollment(en: EnrollmentWithRelations): Promise<void> {
  if (!en.workflow.sender || !en.contact) {
    await db.automationEnrollment.update({
      where: { id: en.id },
      data: { status: "failed", error: "Missing sender or contact" },
    });
    return;
  }

  const graph = parseGraph(en.workflow.steps);
  let nodeId: string | null = en.currentNodeId || null;
  let dueAt = new Date();
  let status: "active" | "completed" | "failed" = "active";
  let error: string | null = null;
  // Guard against infinite loops in cyclic graphs.
  let iterations = 0;

  while (nodeId && iterations < 200) {
    iterations++;
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) break;

    if (node.type === "wait") {
      const data = node.data as WaitData;
      dueAt = addDelay(new Date(), data.amount, data.unit || "hours");
      nodeId = nextNodeId(graph, node.id);
      break; // pause until dueAt
    }

    if (node.type === "sendEmail") {
      const data = node.data as SendEmailData;
      const result = await sendCampaignEmail({
        sender: {
          email: en.workflow.sender.email,
          fromName: en.workflow.sender.fromName,
          passwordEnc: en.workflow.sender.passwordEnc,
        },
        to: en.contact.email,
        name: en.contact.name,
        subject: data.subject,
        content: data.content,
        contentType: data.contentType || "markdown",
        preheader: data.preheader,
      });
      if (!result.ok) {
        status = "failed";
        error = (result.error || "Email send failed").slice(0, 500);
        break;
      }
      nodeId = nextNodeId(graph, node.id);
      dueAt = new Date();
      continue;
    }

    if (node.type === "sendTelegram") {
      const data = node.data as SendTelegramData;
      const result = await sendTelegramMessage(en.contact.telegramChatId, data.message || "");
      // Skipped (no token / no chat id) is NOT a failure — just move on.
      if (!result.ok && !result.skipped) {
        status = "failed";
        error = (result.error || "Telegram send failed").slice(0, 500);
        break;
      }
      nodeId = nextNodeId(graph, node.id);
      dueAt = new Date();
      continue;
    }

    if (node.type === "addTag") {
      const data = node.data as TagData;
      const tag = (data.tag || "").trim();
      if (tag) {
        const existing = en.contact.tags
          ? en.contact.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];
        if (!existing.includes(tag)) {
          existing.push(tag);
          await db.contact.update({
            where: { id: en.contact.id },
            data: { tags: existing.join(",") },
          });
        }
      }
      nodeId = nextNodeId(graph, node.id);
      dueAt = new Date();
      continue;
    }

    if (node.type === "removeTag") {
      const data = node.data as TagData;
      const tag = (data.tag || "").trim();
      if (tag) {
        const existing = en.contact.tags
          ? en.contact.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];
        const next = existing.filter((t) => t !== tag);
        await db.contact.update({
          where: { id: en.contact.id },
          data: { tags: next.join(",") },
        });
      }
      nodeId = nextNodeId(graph, node.id);
      dueAt = new Date();
      continue;
    }

    if (node.type === "addToGroup") {
      const data = node.data as GroupData;
      if (data.groupId) {
        await db.contactGroupAssignment
          .upsert({
            where: { contactId_groupId: { contactId: en.contact.id, groupId: data.groupId } },
            create: { contactId: en.contact.id, groupId: data.groupId },
            update: {},
          })
          .catch(() => {});
      }
      nodeId = nextNodeId(graph, node.id);
      dueAt = new Date();
      continue;
    }

    if (node.type === "removeFromGroup") {
      const data = node.data as GroupData;
      if (data.groupId) {
        await db.contactGroupAssignment
          .deleteMany({ where: { contactId: en.contact.id, groupId: data.groupId } })
          .catch(() => {});
      }
      nodeId = nextNodeId(graph, node.id);
      dueAt = new Date();
      continue;
    }

    if (node.type === "condition") {
      const data = node.data as ConditionData;
      const met = await evaluateCondition(data, en.contact);
      nodeId = nextNodeId(graph, node.id, met ? "true" : "false");
      dueAt = new Date();
      continue;
    }

    // trigger node or unknown — just follow its outgoing edge.
    nodeId = nextNodeId(graph, node.id);
    dueAt = new Date();
  }

  if (status !== "failed" && !nodeId) {
    status = "completed";
    await db.workflow.update({
      where: { id: en.workflowId },
      data: { completedCount: { increment: 1 } },
    });
  }

  await db.automationEnrollment.update({
    where: { id: en.id },
    data: {
      currentNodeId: nodeId || "",
      status,
      dueAt,
      error,
      updatedAt: new Date(),
    },
  });
}

/**
 * Process every active enrollment whose dueAt is now or past.
 * Called by trigger handlers (immediate) and the automation-runner (periodic).
 */
export async function processDueEnrollments(limit = 50): Promise<number> {
  const due = await db.automationEnrollment.findMany({
    where: { status: "active", dueAt: { lte: new Date() } },
    take: limit,
    orderBy: { dueAt: "asc" },
    include: {
      workflow: { include: { sender: { select: { email: true, fromName: true, passwordEnc: true } } } },
      contact: { select: { id: true, email: true, name: true, tags: true, telegram: true, telegramChatId: true } },
    },
  });

  for (const en of due) {
    try {
      await processEnrollment(en as unknown as EnrollmentWithRelations);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing error";
      try {
        await db.automationEnrollment.update({
          where: { id: en.id },
          data: { status: "failed", error: message.slice(0, 500) },
        });
      } catch {
        /* ignore */
      }
    }
  }
  return due.length;
}
