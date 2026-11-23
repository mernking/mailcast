import { NextRequest, NextResponse } from "next/server";
import { deleteImage } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    // `name` is the last path segment; the storage path is images/<name>.
    await deleteImage(`images/${name}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
