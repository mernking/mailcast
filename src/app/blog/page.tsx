import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await db.campaign.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: {
      title: true,
      subject: true,
      slug: true,
      blogExcerpt: true,
      preheader: true,
      publishedAt: true,
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-4xl text-foreground">The MailCast Journal</h1>
          <p className="text-muted-foreground">
            Every newsletter we send, published here so you can read it anytime.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="mt-12 rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
            No posts have been published yet. Check back soon.
          </p>
        ) : (
          <div className="mt-12 grid gap-5">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-3 rounded-2xl border bg-card p-6 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {post.publishedAt && (
                    <span>{post.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                  )}
                  <span>MailCast Journal</span>
                </div>
                <h2 className="font-serif text-2xl text-foreground group-hover:underline">
                  {post.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {post.blogExcerpt || post.preheader || post.subject}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  Read post <ArrowRight className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
