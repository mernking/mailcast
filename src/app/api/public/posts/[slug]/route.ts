import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderBlogHtml } from "@/lib/blog-render";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const post = await db.campaign.findFirst({
      where: { slug, published: true },
      select: {
        title: true,
        subject: true,
        slug: true,
        content: true,
        contentType: true,
        preheader: true,
        publishedAt: true,
        sentAt: true,
      },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...post,
      html: renderBlogHtml(post.content, post.contentType),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
