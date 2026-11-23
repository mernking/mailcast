import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slugify } from "@/lib/blog-render";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const published = (body as { published?: boolean })?.published === true;
    const excerpt = (body as { excerpt?: string })?.excerpt?.trim() || null;

    let slug = campaign.slug;
    if (published && !slug) {
      const base = slugify(campaign.title);
      slug = base;
      // Ensure uniqueness without leaking the campaign id.
      let suffix = 2;
      while (
        await db.campaign.findFirst({ where: { slug, id: { not: id } }, select: { id: true } })
      ) {
        slug = `${base}-${suffix++}`;
      }
    }

    const updated = await db.campaign.update({
      where: { id },
      data: {
        published,
        publishedAt: published ? (campaign.publishedAt ?? new Date()) : null,
        slug: published ? slug : null,
        blogExcerpt: published ? excerpt : null,
      },
      select: {
        id: true,
        published: true,
        publishedAt: true,
        slug: true,
        blogExcerpt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update publication";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
