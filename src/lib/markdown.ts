import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Convert a markdown string to HTML body (no surrounding document). */
export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

/** Convert markdown to plain text for the text/plain email part. */
export function markdownToText(md: string): string {
  return md
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
