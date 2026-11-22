/**
 * GrapesJS configuration and utilities for email builder.
 */

/**
 * Clean GrapesJS/MJML output for the email pipeline.
 * - Strips GrapesJS wrapper comments (<!-- ... -->)
 * - Removes GrapesJS-specific classes and style attributes
 * - Preserves <a href>, <img src> (data: URIs, cid:, tracking pixels)
 * - Normalizes whitespace
 */
export function prepareBuilderHtml(html: string): string {
  let out = html;

  // Remove GrapesJS wrapper comments: <!-- <tag> --> and <!-- </tag> -->
  out = out.replace(/<!--\s*<\/?[^>]+>\s*-->/g, "");

  // Remove GrapesJS-specific classes
  out = out.replace(/\sclass\s*=\s*["'][^"']*gjs-[^"']*["']/g, "");
  out = out.replace(/\sclass\s*=\s*["'][^"']*grapesjs[^"']*["']/g, "");

  // Remove GrapesJS-specific style attributes (position:absolute etc. used for drag handles)
  out = out.replace(/\sstyle\s*=\s*["'][^"']*position:\s*absolute[^"']*["']/g, "");
  out = out.replace(/\sstyle\s*=\s*["'][^"']*z-index:\s*\d+[^"']*["']/g, "");

  // Remove empty style attributes
  out = out.replace(/\sstyle\s*=\s*["']\s*["']/g, "");
  out = out.replace(/\sstyle\s*=\s*["']\s*;\s*["']/g, "");

  // Normalize whitespace: collapse multiple spaces/newlines
  out = out.replace(/>\s+</g, "><");
  out = out.replace(/\s{2,}/g, " ");

  // Remove empty lines
  out = out.replace(/^\s+|\s+$/gm, "");

  return out.trim();
}
