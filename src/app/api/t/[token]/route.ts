import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasOpenEvent } from "@/lib/tracking";

export const dynamic = "force-dynamic";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const record = await db.trackingToken.findUnique({ where: { token } });
  if (!record) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  if (record.kind === "open") {
    const existing = await db.trackingEvent.findMany({
      where: {
        campaignId: record.campaignId,
        recipientId: record.recipientId,
        kind: "open",
      },
      select: { recipientId: true, campaignId: true, kind: true },
    });
    if (!hasOpenEvent(existing, record.recipientId, record.campaignId)) {
      await db.$transaction([
        db.trackingEvent.create({
          data: {
            tokenId: record.token,
            campaignId: record.campaignId,
            recipientId: record.recipientId,
            kind: "open",
            ip,
            userAgent,
          },
        }),
        db.campaign.update({
          where: { id: record.campaignId },
          data: { openedCount: { increment: 1 } },
        }),
      ]);
    }
    return new NextResponse(new Uint8Array(PIXEL), {
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(PIXEL.byteLength),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  await db.$transaction([
    db.trackingEvent.create({
      data: {
        tokenId: record.token,
        campaignId: record.campaignId,
        recipientId: record.recipientId,
        kind: "click",
        ip,
        userAgent,
      },
    }),
    db.campaign.update({
      where: { id: record.campaignId },
      data: { clickedCount: { increment: 1 } },
    }),
  ]);

  const destination = record.url;
  if (!destination) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(null, {
    status: 302,
    headers: { Location: destination },
  });
}
