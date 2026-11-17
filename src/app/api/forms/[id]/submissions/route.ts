import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseData(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return {};
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const form = await db.form.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    );

    const [total, rows] = await Promise.all([
      db.formSubmission.count({ where: { formId: id } }),
      db.formSubmission.findMany({
        where: { formId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          data: true,
          contactId: true,
          createdAt: true,
        },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      data: parseData(r.data),
      contactId: r.contactId,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load submissions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
