import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalContacts,
      activeContacts,
      totalCampaigns,
      sentCampaignsAgg,
      sentSumAgg,
      deliveryAgg,
      recentCampaigns,
    ] = await Promise.all([
      db.contact.count(),
      db.contact.count({ where: { active: true } }),
      db.campaign.count(),
      db.campaign.aggregate({ _count: { _all: true }, where: { status: "sent" } }),
      db.campaign.aggregate({ _sum: { sentCount: true } }),
      db.campaign.aggregate({
        _sum: { sentCount: true, failedCount: true },
        where: { status: "sent" },
      }),
      db.campaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { sender: { select: { email: true, fromName: true } } },
      }),
    ]);

    const sentSum = sentSumAgg._sum.sentCount || 0;
    const sentForDelivery = deliveryAgg._sum.sentCount || 0;
    const failedForDelivery = deliveryAgg._sum.failedCount || 0;
    const deliveryRate =
      sentForDelivery + failedForDelivery > 0
        ? Math.round((sentForDelivery / (sentForDelivery + failedForDelivery)) * 1000) / 10
        : 0;

    return NextResponse.json({
      totalContacts,
      activeContacts,
      totalCampaigns,
      sentCampaigns: sentCampaignsAgg._count._all,
      totalEmailsSent: sentSum,
      deliveryRate,
      recentCampaigns: recentCampaigns.map((c) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        status: c.status,
        totalRecip: c.totalRecip,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        createdAt: c.createdAt,
        sentAt: c.sentAt,
        sender: c.sender
          ? { email: c.sender.email, fromName: c.sender.fromName }
          : null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
