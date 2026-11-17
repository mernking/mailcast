import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.senderAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete sender";
    // Prisma throws P2003 (foreign key constraint) when campaigns reference this sender.
    if (/foreign|constraint|P2003/i.test(message)) {
      return NextResponse.json(
        { error: "Delete campaigns using this sender first." },
        { status: 409 }
      );
    }
    if (/P2025|not found|no record/i.test(message)) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
