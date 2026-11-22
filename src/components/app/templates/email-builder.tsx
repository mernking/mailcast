import dynamic from "next/dynamic";

/**
 * Props for the EmailBuilder component.
 */
export interface EmailBuilderProps {
  templateId?: string;
  onHtml: (html: string) => void;
  onSave?: (project: string, mjml: string, html: string) => Promise<void>;
}

/**
 * Server component that dynamically imports the client-only GrapesJS editor.
 * Uses ssr: false because GrapesJS requires browser APIs (window, document).
 */
const EmailBuilderClient = dynamic<EmailBuilderProps>(
  () => import("./email-builder-client").then((mod) => mod.EmailBuilderClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded-lg border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading email builder...</p>
        </div>
      </div>
    ),
  }
);

/**
 * GrapesJS/MJML Email Builder wrapper.
 * @param templateId - Optional template ID to load
 * @param onHtml - Callback with exported HTML (called on every change)
 * @param onSave - Optional callback when user saves (project, mjml, html)
 */
export function EmailBuilder({ templateId, onHtml, onSave }: EmailBuilderProps) {
  return <EmailBuilderClient templateId={templateId} onHtml={onHtml} onSave={onSave} />;
}