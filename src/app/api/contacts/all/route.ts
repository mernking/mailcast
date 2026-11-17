import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const result = await db.contact.deleteMany({});
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
