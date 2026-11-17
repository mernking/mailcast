import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrollContact, processDueEnrollments } from "@/lib/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/workflows/[id]/enroll
 *
 * Manually enroll contacts into this workflow. The workflow's trigger must be
 * "manual" — enrollContact filters by trigger, so non-manual workflows won't
 * pick up manual enrollments.
 *
 * Body (one of):
 *   { contactIds: string[] }     — enroll specific contacts
 *   { tag: string }              — enroll every active contact with this tag
 *   { all: true }                — enroll every active contact
 *
 * After enrolling, immediately process due steps (so no-delay first steps run).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const workflow = await db.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }
    if (workflow.trigger !== "manual") {
      return NextResponse.json(
        { error: "This workflow is not triggered manually." },
        { status: 400 }
      );
    }
    if (!workflow.enabled) {
      return NextResponse.json(
        { error: "This workflow is disabled. Enable it before enrolling." },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const payload = (body ?? {}) as {
      contactIds?: string[];
      tag?: string;
      all?: boolean;
    };

    // Resolve the set of contact IDs to enroll.
    let contactIds: string[] = [];

    if (Array.isArray(payload.contactIds) && payload.contactIds.length > 0) {
      // Validate they exist + are active.
      const rows = await db.contact.findMany({
        where: { id: { in: payload.contactIds.filter(Boolean) } },
        select: { id: true, active: true },
      });
      contactIds = rows.filter((r) => r.active).map((r) => r.id);
    } else if (typeof payload.tag === "string" && payload.tag.trim()) {
      const tag = payload.tag.trim();
      // tags is a comma-separated string; match contacts whose tag list contains it.
      const rows = await db.contact.findMany({
        where: { active: true },
        select: { id: true, tags: true },
      });
      contactIds = rows
        .filter((r) =>
          r.tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .includes(tag.toLowerCase())
        )
        .map((r) => r.id);
    } else if (payload.all === true) {
      const rows = await db.contact.findMany({
        where: { active: true },
        select: { id: true },
      });
      contactIds = rows.map((r) => r.id);
    } else {
      return NextResponse.json(
        {
          error:
            "Provide contactIds[], a tag, or all:true to specify which contacts to enroll.",
        },
        { status: 400 }
      );
    }

    if (contactIds.length === 0) {
      return NextResponse.json({
        ok: true,
        enrolled: 0,
        processed: 0,
        warning: "No matching contacts to enroll.",
      });
    }

    let enrolled = 0;
    for (const contactId of contactIds) {
      const created = await enrollContact(contactId, "manual", {});
      enrolled += created;
    }

    // Immediately process any no-delay first steps for the new enrollments.
    const processed = await processDueEnrollments(100);

    return NextResponse.json({
      ok: true,
      enrolled,
      processed,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to enroll contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
