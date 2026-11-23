import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { renderBlogHtml } from "@/lib/blog-render";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await db.campaign.findFirst({
    where: { slug, published: true },
    select: {
      title: true,
      subject: true,
      content: true,
      contentType: true,
      publishedAt: true,
    },
  });
  if (!post) notFound();

  const html = renderBlogHtml(post.content, post.contentType);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All posts
        </Link>

        <article className="mt-8">
          {post.publishedAt && (
            <p className="text-xs text-muted-foreground">
              {post.publishedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground">
            {post.title}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{post.subject}</p>

          <div
            className="prose mt-10 max-w-none [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_table]:w-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </main>
      <Footer />
    </div>
  );
}
