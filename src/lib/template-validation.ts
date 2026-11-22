/**
 * Validation for EmailTemplate API payloads.
 */

export interface TemplateInput {
  name: string;
  project?: string;
  mjml?: string;
  html?: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validate a template payload.
 * Requires: name, and at least one of project or html.
 */
export function validateTemplate(input: TemplateInput): ValidationResult {
  if (!input.name || !input.name.trim()) {
    return { ok: false, error: "Template name is required" };
  }
  
  const hasProject = input.project && input.project.trim().length > 0;
  const hasHtml = input.html && input.html.trim().length > 0;
  
  if (!hasProject && !hasHtml) {
    return { ok: false, error: "Either project or html is required" };
  }
  
  return { ok: true };
}
