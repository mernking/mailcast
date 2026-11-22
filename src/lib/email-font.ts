/**
 * Font stack helpers for email template.
 * Provides business-safe font stacks (no Apple/system fonts).
 */

export type FontFamily = "helvetica" | "arial" | "verdana" | "georgia";

const FONT_STACKS: Record<FontFamily, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
};

/**
 * Get a business-safe font stack for email.
 * @param family - Font family key, defaults to "helvetica"
 * @returns CSS font-family string
 */
export function getFontStack(family?: string): string {
  const key = (family?.toLowerCase() || "helvetica") as FontFamily;
  return FONT_STACKS[key] || FONT_STACKS.helvetica;
}

/**
 * Remove the wrapper padding from rendered email HTML.
 * The original template has 24px outer and 40px inner padding.
 * @param html - Full rendered email HTML
 * @returns HTML with wrapper padding removed
 */
export function stripWrapperPadding(html: string): string {
  let out = html;
  // Remove outer padding: padding:24px 12px
  out = out.replace(/padding:\s*24px\s+12px/g, "padding:0 12px");
  // Remove inner padding: padding:40px 40px (and variants)
  out = out.replace(/padding:\s*40px\s+40px\s+\d+px\s+40px/g, "padding:0");
  out = out.replace(/padding:\s*40px\s+40px/g, "padding:0");
  return out;
}
