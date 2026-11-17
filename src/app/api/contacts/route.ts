import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeTags(tags?: string | string[]): string {
  if (!tags) return "";
  if (Array.isArray(tags)) return tags.map((t) => t.trim()).filter(Boolean).join(",");
  return String(tags)
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(",");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    );

    const where = q
      ? {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
            { tags: { contains: q } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      db.contact.count({ where }),
      db.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          tags: true,
          source: true,
          active: true,
          telegram: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, name, tags } = (body ?? {}) as {
      email?: string;
      name?: string | null;
      tags?: string | string[];
    };

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name && name.trim().length ? name.trim() : null;
    const cleanTags = normalizeTags(tags);

    // Note: email is indexed but not @unique in the schema, so we look it up
    // with findFirst and then update or create. Duplicate email entries are
    // tolerated by the schema but deduped here at the application layer.
    const existing = await db.contact.findFirst({ where: { email: cleanEmail } });
    let contact;
    if (existing) {
      contact = await db.contact.update({
        where: { id: existing.id },
        data: {
          name: cleanName ?? existing.name,
          tags: cleanTags,
          active: true,
        },
      });
    } else {
      contact = await db.contact.create({
        data: {
          email: cleanEmail,
          name: cleanName,
          tags: cleanTags,
          source: "manual",
          active: true,
        },
      });
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
