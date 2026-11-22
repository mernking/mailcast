import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const campaigns = await db.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { email: true, fromName: true } },
      },
    });

    const items = campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      subject: c.subject,
      status: c.status,
      totalRecip: c.totalRecip,
      sentCount: c.sentCount,
      failedCount: c.failedCount,
      openedCount: c.openedCount,
      fontFamily: c.fontFamily,
      createdAt: c.createdAt,
      sentAt: c.sentAt,
      sender: c.sender ? { email: c.sender.email, fromName: c.sender.fromName } : null,
    }));

    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load campaigns";
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

    const { title, subject, content, preheader, senderId, contentType, targetGroupId, trackOpens, trackClicks, fontFamily } = (body ?? {}) as {
      title?: string;
      subject?: string;
      content?: string;
      preheader?: string | null;
      senderId?: string;
      contentType?: string;
      targetGroupId?: string | null;
      trackOpens?: boolean;
      trackClicks?: boolean;
      fontFamily?: string;
    };

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!subject || subject.trim().length === 0) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (!senderId) {
      return NextResponse.json({ error: "A sender is required" }, { status: 400 });
    }

    const sender = await db.senderAccount.findUnique({ where: { id: senderId } });
    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    const campaign = await db.campaign.create({
      data: {
        title: title.trim(),
        subject: subject.trim(),
        content,
        contentType:
          contentType === "html" ? "html" : "markdown",
        preheader: preheader && preheader.trim() ? preheader.trim() : null,
        senderId,
        targetGroupId: targetGroupId || null,
        trackOpens: trackOpens !== false,
        trackClicks: trackClicks !== false,
        fontFamily: fontFamily || "helvetica",
        status: "draft",
      },
      include: {
        sender: { select: { email: true, fromName: true } },
      },
    });

    return NextResponse.json(
      {
        id: campaign.id,
        title: campaign.title,
        subject: campaign.subject,
        content: campaign.content,
        contentType: campaign.contentType,
        preheader: campaign.preheader,
        targetGroupId: campaign.targetGroupId,
        status: campaign.status,
        senderId: campaign.senderId,
        totalRecip: campaign.totalRecip,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        openedCount: campaign.openedCount,
        trackOpens: campaign.trackOpens,
        trackClicks: campaign.trackClicks,
        fontFamily: campaign.fontFamily,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        sentAt: campaign.sentAt,
        sender: campaign.sender,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
