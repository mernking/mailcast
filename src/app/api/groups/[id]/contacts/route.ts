import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await db.contactGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1
    );
    const limit = Math.min(
      500,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || "50", 10) || 50
      )
    );

    // Build the where-clause on the join table (assignment.groupId) and an
    // optional search filter on the contact.
    const contactWhere = q
      ? {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
            { tags: { contains: q } },
          ],
        }
      : {};

    const [total, assignments] = await Promise.all([
      db.contactGroupAssignment.count({
        where: { groupId: id, contact: contactWhere },
      }),
      db.contactGroupAssignment.findMany({
        where: { groupId: id, contact: contactWhere },
        orderBy: { contact: { createdAt: "desc" } },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          contact: {
            select: {
              id: true,
              email: true,
              name: true,
              tags: true,
              active: true,
              telegram: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const items = assignments.map((a) => a.contact);

    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load group contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await db.contactGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
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

    const b = (body ?? {}) as { contactIds?: string[] };
    const contactIds = Array.isArray(b.contactIds)
      ? b.contactIds.filter((x) => typeof x === "string" && x.trim())
      : [];

    if (contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds[] is required" },
        { status: 400 }
      );
    }

    // Upsert each membership (unique [contactId, groupId]).
    let added = 0;
    for (const contactId of contactIds) {
      await db.contactGroupAssignment.upsert({
        where: {
          contactId_groupId: { contactId, groupId: id },
        },
        create: { contactId, groupId: id },
        update: {},
      });
      added += 1;
    }

    return NextResponse.json({ added }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add contacts to group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await db.contactGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Accept either ?contactId=... on the query string or { contactId } in
    // the JSON body.
    let contactId: string | undefined;
    const url = new URL(req.url);
    contactId = (url.searchParams.get("contactId") || "").trim() || undefined;

    if (!contactId) {
      // Try a JSON body.
      try {
        const body = (await req.json()) as { contactId?: string };
        if (body && typeof body.contactId === "string") {
          contactId = body.contactId.trim();
        }
      } catch {
        // No body / invalid JSON is fine — we'll fall through to the 400.
      }
    }

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required (query or body)" },
        { status: 400 }
      );
    }

    await db.contactGroupAssignment.deleteMany({
      where: { contactId, groupId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove contact from group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
