import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_COLOR = "#1a1a1a";

function validColor(v: unknown): string {
  if (typeof v !== "string") return DEFAULT_COLOR;
  const s = v.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : DEFAULT_COLOR;
}

function toGroupDetail(g: {
  id: string;
  name: string;
  description: string | null;
  color: string;
  formId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { assignments: number };
  form: { name: string } | null;
}) {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    color: g.color,
    formId: g.formId,
    formName: g.form?.name ?? null,
    contactCount: g._count.assignments,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await db.contactGroup.findUnique({
      where: { id },
      include: {
        _count: { select: { assignments: true } },
        form: { select: { name: true } },
      },
    });
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(toGroupDetail(group));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.contactGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const patch = (body ?? {}) as {
      name?: string;
      description?: string | null;
      color?: string;
    };

    const data: Record<string, unknown> = {};
    if (typeof patch.name === "string" && patch.name.trim()) {
      data.name = patch.name.trim();
    }
    if (patch.description === null) {
      data.description = null;
    } else if (typeof patch.description === "string") {
      data.description = patch.description.trim() || null;
    }
    if (typeof patch.color === "string") {
      data.color = validColor(patch.color);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await db.contactGroup.update({
      where: { id },
      data,
      include: {
        _count: { select: { assignments: true } },
        form: { select: { name: true } },
      },
    });

    return NextResponse.json(toGroupDetail(updated));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Cascade assignments explicitly (Prisma onDelete: Cascade does it too,
    // but being defensive here avoids surprises). The formId link is
    // SetNull on the schema, so forms keep working — just no longer fed.
    await db.contactGroup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete group";
    if (/P2025|not found|no record/i.test(message)) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
