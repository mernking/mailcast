import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await db.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        totalRecip: true,
        sentCount: true,
        failedCount: true,
        openedCount: true,
        status: true,
      },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const pendingCount = Math.max(
      0,
      campaign.totalRecip - campaign.sentCount - campaign.failedCount
    );

    const recentRecipients = await db.campaignRecipient.findMany({
      where: { campaignId: id },
      orderBy: { sentAt: "desc" },
      take: 50,
      select: {
        status: true,
        error: true,
        sentAt: true,
        contact: { select: { email: true, name: true } },
      },
    });

    const recent = recentRecipients
      .filter((r) => r.contact)
      .map((r) => ({
        email: r.contact.email,
        name: r.contact.name,
        status: r.status,
        error: r.error,
        sentAt: r.sentAt,
      }));

    return NextResponse.json({
      totalRecip: campaign.totalRecip,
      sentCount: campaign.sentCount,
      failedCount: campaign.failedCount,
      openedCount: campaign.openedCount,
      pendingCount,
      status: campaign.status,
      recent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load campaign stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
