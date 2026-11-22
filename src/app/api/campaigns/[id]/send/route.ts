import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendCampaignEmail } from "@/lib/gmail";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Broadcast a campaign to every active contact.
 *
 * Steps:
 *  1. Load campaign + sender. Refuse if already sent/sending.
 *  2. Count active contacts -> totalRecip. Mark campaign 'sending'.
 *  3. Insert pending CampaignRecipient rows (skip existing).
 *  4. Iterate sequentially: send + update each recipient + track counts.
 *  5. Set status='sent' + sentAt=now at the end.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let campaign;
  try {
    campaign = await db.campaign.findUnique({
      where: { id },
      include: { sender: true },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (!campaign.sender) {
    return NextResponse.json({ error: "Sender is missing." }, { status: 400 });
  }
  if (campaign.status === "sending") {
    return NextResponse.json(
      { error: "Campaign is currently sending." },
      { status: 409 }
    );
  }
  if (campaign.status === "sent") {
    return NextResponse.json(
      { error: "Campaign has already been sent." },
      { status: 409 }
    );
  }

  try {
    // Count active recipients. If the campaign targets a group, restrict to
    // contacts assigned to that group; otherwise all active contacts.
    const where = campaign.targetGroupId
      ? { active: true, groupAssignments: { some: { groupId: campaign.targetGroupId } } }
      : { active: true };
    const activeContacts = await db.contact.findMany({
      where,
      select: { id: true, email: true, name: true },
    });

    const totalRecip = activeContacts.length;

    // Mark as sending + set total.
    await db.campaign.update({
      where: { id },
      data: { status: "sending", totalRecip },
    });

    // Insert pending recipient rows for contacts that don't already have a row.
    // (SQLite's createMany does not support skipDuplicates, so we filter first.)
    if (totalRecip > 0) {
      const existingContactIds = new Set(
        (
          await db.campaignRecipient.findMany({
            where: { campaignId: id },
            select: { contactId: true },
          })
        ).map((r) => r.contactId)
      );
      const newRecipients = activeContacts
        .filter((c) => !existingContactIds.has(c.id))
        .map((c) => ({
          campaignId: id,
          contactId: c.id,
          status: "pending" as const,
        }));
      if (newRecipients.length > 0) {
        await db.campaignRecipient.createMany({ data: newRecipients });
      }
    }

    if (totalRecip === 0) {
      // Nothing to send — flip straight to sent.
      await db.campaign.update({
        where: { id },
        data: { status: "sent", sentAt: new Date(), sentCount: 0, failedCount: 0 },
      });
      return NextResponse.json({
        ok: true,
        totalRecip: 0,
        sentCount: 0,
        failedCount: 0,
        warning: "No active contacts to send to.",
      });
    }

    // Re-load pending recipients with their contact info for sending.
    const pending = await db.campaignRecipient.findMany({
      where: { campaignId: id, status: "pending" },
      include: { contact: { select: { email: true, name: true } } },
    });

    const sender = {
      email: campaign.sender.email,
      fromName: campaign.sender.fromName,
      passwordEnc: campaign.sender.passwordEnc,
    };

    let sentCount = 0;
    let failedCount = 0;

    for (const recip of pending) {
      if (!recip.contact) continue;
      const result = await sendCampaignEmail({
        sender,
        to: recip.contact.email,
        name: recip.contact.name,
        subject: campaign.subject,
        content: campaign.content,
        contentType: (campaign.contentType as "markdown" | "html") ?? "markdown",
        preheader: campaign.preheader,
      });

      if (result.ok) {
        sentCount++;
        console.log(`[send] campaign=${id} recipient=${recip.contact.email} accepted=${result.accepted.join(",")}`);
        try {
          await db.campaignRecipient.update({
            where: { id: recip.id },
            data: { status: "sent", sentAt: new Date(), error: null },
          });
        } catch {
          // Best-effort — counts are tracked in memory.
        }
      } else {
        failedCount++;
        console.warn(`[send] campaign=${id} recipient=${recip.contact.email} rejected: ${result.error || "unknown error"}`);
        try {
          await db.campaignRecipient.update({
            where: { id: recip.id },
            data: {
              status: "failed",
              error: (result.error || "Unknown error").slice(0, 500),
            },
          });
        } catch {
          // Best-effort.
        }
      }
    }

    const allFailed = sentCount === 0 && failedCount > 0;
    await db.campaign.update({
      where: { id },
      data: {
        status: allFailed ? "failed" : "sent",
        sentAt: new Date(),
        sentCount,
        failedCount,
      },
    });

    const warning =
      failedCount > 0
        ? `${failedCount} recipient(s) were rejected — check "Recent deliveries" for details.`
        : totalRecip > 400
          ? `Sent ${sentCount}/${totalRecip} (large broadcast — verify Gmail daily limits).`
          : undefined;

    return NextResponse.json({
      ok: failedCount === 0,
      totalRecip,
      sentCount,
      failedCount,
      warning,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Broadcast failed unexpectedly";
    try {
      await db.campaign.update({
        where: { id },
        data: { status: "failed" },
      });
    } catch {
      // ignore secondary errors
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
