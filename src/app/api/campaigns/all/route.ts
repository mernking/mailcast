import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    // CampaignRecipient rows cascade-delete with the campaign.
    const result = await db.campaign.deleteMany({});
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
