import { db } from "./db";
import { sendCampaignEmail } from "./gmail";
import type { EmailContentType } from "./email-template";

/**
 * Automation engine: enroll contacts into workflows and process due steps.
 * Shared between the Next.js API routes (immediate processing on trigger)
 * and the automation-runner mini-service (periodic processing of waits).
 */

export type WorkflowTrigger = "form_submit" | "contact_added" | "manual";

interface SendEmailStepConfig {
  subject: string;
  content: string;
  contentType: EmailContentType;
  preheader?: string;
}

interface WaitStepConfig {
  amount: number;
  unit: "minutes" | "hours" | "days";
}

interface ConditionStepConfig {
  /** "has_tag" | "no_tag" */
  type: "has_tag" | "no_tag";
  tag: string;
  /** Step index to jump to when the condition is met (otherwise continue). */
  branchTo?: number;
}

export interface WorkflowStep {
  id: string;
  type: "send_email" | "wait" | "condition";
  config: SendEmailStepConfig | WaitStepConfig | ConditionStepConfig;
}

function addDelay(from: Date, amount: number, unit: WaitStepConfig["unit"]): Date {
  const ms =
    unit === "minutes"
      ? amount * 60_000
      : unit === "hours"
        ? amount * 3_600_000
        : amount * 86_400_000;
  return new Date(from.getTime() + ms);
}

/**
 * Enroll a contact into every enabled workflow that matches the trigger.
 * For "form_submit", `context.formId` must match the workflow's triggerConfig.formId.
 * Skips workflows the contact is already enrolled in.
 * Returns the number of new enrollments created.
 */
export async function enrollContact(
  contactId: string,
  trigger: WorkflowTrigger,
  context: { formId?: string } = {}
): Promise<number> {
  const workflows = await db.workflow.findMany({
    where: { enabled: true, trigger },
  });

  let created = 0;
  for (const wf of workflows) {
    let cfg: { formId?: string } = {};
    try {
      cfg = JSON.parse(wf.triggerConfig || "{}");
    } catch {
      cfg = {};
    }
    if (trigger === "form_submit" && context.formId && cfg.formId && cfg.formId !== context.formId) {
      continue;
    }

    const existing = await db.automationEnrollment.findFirst({
      where: { workflowId: wf.id, contactId },
      select: { id: true },
    });
    if (existing) continue;

    await db.automationEnrollment.create({
      data: {
        workflowId: wf.id,
        contactId,
        currentStep: 0,
        status: "active",
        dueAt: new Date(),
      },
    });
    await db.workflow.update({
      where: { id: wf.id },
      data: { enrolledCount: { increment: 1 } },
    });
    created++;
  }
  return created;
}

interface EnrollmentWithRelations {
  id: string;
  currentStep: number;
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
  } | null;
}

/**
 * Execute the current step for an enrollment, then advance.
 * - send_email: send immediately, advance, continue to next step.
 * - wait: set dueAt = now + delay, advance, stop (wait for next processing).
 * - condition: evaluate tag membership, jump or advance, continue.
 * Loops until a wait is hit or the workflow completes.
 */
async function processEnrollment(en: EnrollmentWithRelations): Promise<void> {
  if (!en.workflow.sender || !en.contact) {
    await db.automationEnrollment.update({
      where: { id: en.id },
      data: { status: "failed", error: "Missing sender or contact" },
    });
    return;
  }

  let steps: WorkflowStep[] = [];
  try {
    steps = JSON.parse(en.workflow.steps || "[]") as WorkflowStep[];
  } catch {
    steps = [];
  }

  let stepIdx = en.currentStep;
  let dueAt = new Date();
  let status: "active" | "completed" | "failed" = "active";
  let error: string | null = null;

  while (stepIdx < steps.length) {
    const step = steps[stepIdx];
    if (!step) break;

    if (step.type === "wait") {
      const cfg = step.config as WaitStepConfig;
      dueAt = addDelay(new Date(), Math.max(1, Number(cfg.amount) || 1), cfg.unit || "hours");
      stepIdx += 1; // advance past the wait; next step runs at dueAt
      break; // stop processing until due
    }

    if (step.type === "send_email") {
      const cfg = step.config as SendEmailStepConfig;
      const result = await sendCampaignEmail({
        sender: {
          email: en.workflow.sender.email,
          fromName: en.workflow.sender.fromName,
          passwordEnc: en.workflow.sender.passwordEnc,
        },
        to: en.contact.email,
        name: en.contact.name,
        subject: cfg.subject,
        content: cfg.content,
        contentType: cfg.contentType || "markdown",
        preheader: cfg.preheader,
      });
      if (!result.ok) {
        status = "failed";
        error = (result.error || "Send failed").slice(0, 500);
        break;
      }
      stepIdx += 1;
      dueAt = new Date(); // continue immediately to next step
      continue;
    }

    if (step.type === "condition") {
      const cfg = step.config as ConditionStepConfig;
      const tags = en.contact.tags
        ? en.contact.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
      const hasTag = tags.includes(cfg.tag);
      const met = cfg.type === "has_tag" ? hasTag : !hasTag;
      if (met && typeof cfg.branchTo === "number") {
        stepIdx = cfg.branchTo;
      } else {
        stepIdx += 1;
      }
      dueAt = new Date();
      continue;
    }

    // Unknown step type — skip it.
    stepIdx += 1;
  }

  if (status !== "failed" && stepIdx >= steps.length) {
    status = "completed";
    await db.workflow.update({
      where: { id: en.workflowId },
      data: { completedCount: { increment: 1 } },
    });
  }

  await db.automationEnrollment.update({
    where: { id: en.id },
    data: {
      currentStep: stepIdx,
      status,
      dueAt,
      error,
      updatedAt: new Date(),
    },
  });
}

/**
 * Process every active enrollment whose dueAt is now or in the past.
 * Called by the form/contact trigger handlers (immediate) and by the
 * automation-runner mini-service (every 60s) to advance wait steps.
 * Returns the number of enrollments processed.
 */
export async function processDueEnrollments(limit = 50): Promise<number> {
  const due = await db.automationEnrollment.findMany({
    where: { status: "active", dueAt: { lte: new Date() } },
    take: limit,
    orderBy: { dueAt: "asc" },
    include: {
      workflow: { include: { sender: { select: { email: true, fromName: true, passwordEnc: true } } } },
      contact: { select: { id: true, email: true, name: true, tags: true } },
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
        // ignore
      }
    }
  }
  return due.length;
}
