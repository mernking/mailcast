import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_COLOR = "#1a1a1a";

function validColor(v: unknown): string {
  if (typeof v !== "string") return DEFAULT_COLOR;
  const s = v.trim();
  // Allow hex colors only; default on anything weird.
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : DEFAULT_COLOR;
}

export async function GET() {
  try {
    const groups = await db.contactGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { assignments: true } },
        form: { select: { name: true } },
      },
    });

    const items = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      color: g.color,
      formId: g.formId,
      formName: g.form?.name ?? null,
      contactCount: g._count.assignments,
      createdAt: g.createdAt,
    }));

    return NextResponse.json(items);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load groups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const b = (body ?? {}) as {
      name?: string;
      description?: string | null;
      color?: string;
    };

    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const description =
      typeof b.description === "string" && b.description.trim()
        ? b.description.trim()
        : null;

    const created = await db.contactGroup.create({
      data: {
        name,
        description,
        color: validColor(b.color),
      },
      include: {
        _count: { select: { assignments: true } },
        form: { select: { name: true } },
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        description: created.description,
        color: created.color,
        formId: created.formId,
        formName: created.form?.name ?? null,
        contactCount: created._count.assignments,
        createdAt: created.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
