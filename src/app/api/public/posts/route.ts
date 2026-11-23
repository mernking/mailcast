import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await db.campaign.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        slug: true,
        blogExcerpt: true,
        preheader: true,
        publishedAt: true,
        sentAt: true,
      },
    });
    return NextResponse.json({ posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load posts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
