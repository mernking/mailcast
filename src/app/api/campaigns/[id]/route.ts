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
      include: {
        sender: { select: { email: true, fromName: true, verified: true } },
        _count: { select: { recipients: true } },
      },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({
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
      clickedCount: campaign.clickedCount,
      trackOpens: campaign.trackOpens,
      trackClicks: campaign.trackClicks,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      sentAt: campaign.sentAt,
      sender: campaign.sender
        ? {
            email: campaign.sender.email,
            fromName: campaign.sender.fromName,
            verified: campaign.sender.verified,
          }
        : null,
      recipientCount: campaign._count.recipients,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (existing.status === "sending" || existing.status === "sent") {
      return NextResponse.json(
        { error: "Cannot edit a campaign that has been sent or is currently sending." },
        { status: 409 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const patch = (body ?? {}) as {
      title?: string;
      subject?: string;
      content?: string;
      contentType?: string;
      preheader?: string | null;
      senderId?: string;
      targetGroupId?: string | null;
      trackOpens?: boolean;
      trackClicks?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (typeof patch.title === "string" && patch.title.trim()) data.title = patch.title.trim();
    if (typeof patch.subject === "string" && patch.subject.trim()) data.subject = patch.subject.trim();
    if (typeof patch.content === "string") data.content = patch.content;
    if (patch.contentType === "html" || patch.contentType === "markdown") data.contentType = patch.contentType;
    if (patch.preheader === null) data.preheader = null;
    else if (typeof patch.preheader === "string") data.preheader = patch.preheader.trim() || null;
    if (patch.targetGroupId === null) data.targetGroupId = null;
    else if (typeof patch.targetGroupId === "string") data.targetGroupId = patch.targetGroupId || null;
    if (typeof patch.trackOpens === "boolean") data.trackOpens = patch.trackOpens;
    if (typeof patch.trackClicks === "boolean") data.trackClicks = patch.trackClicks;
    if (typeof patch.senderId === "string" && patch.senderId) {
      const sender = await db.senderAccount.findUnique({ where: { id: patch.senderId } });
      if (!sender) {
        return NextResponse.json({ error: "Sender not found" }, { status: 404 });
      }
      data.senderId = patch.senderId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.campaign.update({
      where: { id },
      data,
      include: {
        sender: { select: { email: true, fromName: true, verified: true } },
        _count: { select: { recipients: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      subject: updated.subject,
      content: updated.content,
      contentType: updated.contentType,
      preheader: updated.preheader,
      targetGroupId: updated.targetGroupId,
      status: updated.status,
      senderId: updated.senderId,
      totalRecip: updated.totalRecip,
      sentCount: updated.sentCount,
      failedCount: updated.failedCount,
      openedCount: updated.openedCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      sentAt: updated.sentAt,
      sender: updated.sender,
      recipientCount: updated._count.recipients,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete campaign";
    if (/P2025|not found|no record/i.test(message)) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
