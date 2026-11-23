import { markdownToHtml } from "./markdown.ts";
import { sanitizeEmailHtml } from "./email-template.ts";

/** Replace personalization placeholders with neutral text for public viewing. */
export function stripMergeTags(text: string): string {
  return text
    .replace(/\{\{\s*first_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*name\s*\}\}/gi, "there")
    .replace(/\{\{\s*email\s*\}\}/gi, "")
    .replace(/\{\{\s*[\w.]+\s*\}\}/g, "");
}

/** Convert a campaign body into safe, self-contained HTML for the public blog. */
export function renderBlogHtml(content: string, contentType: string): string {
  const raw = contentType === "html" ? sanitizeEmailHtml(content) : markdownToHtml(content);
  return stripMergeTags(raw)
    // Tracking pixels and absolute tracking links mean nothing on the blog.
    .replace(/<img[^>]*src=["'][^"']*\/api\/t\/[^"']*["'][^>]*>/gi, "")
    .replace(/href=["'][^"']*\/api\/t\/[^"']*["']/gi, 'href="#"');
}

/** Build a stable URL slug from a campaign title. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "post";
}
