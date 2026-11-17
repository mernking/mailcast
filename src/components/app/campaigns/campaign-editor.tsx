"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Loader2,
  Send,
  Save,
  AlertTriangle,
  MailWarning,
  Eye,
  PencilLine,
  Code,
  Type,
} from "lucide-react";

import { useFetch, apiFetch, fmtDateTime, truncate } from "../use-api";
import { useAppStore } from "@/hooks/use-app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { RecipientStatusBadge, StatusBadge } from "../status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { markdownToHtml } from "@/lib/markdown";
import { RichTextEditor } from "./rich-text-editor";

interface Sender {
  id: string;
  email: string;
  fromName: string;
  verified: boolean;
  createdAt: string;
}

interface CampaignDetail {
  id: string;
  title: string;
  subject: string;
  content: string;
  contentType: string;
  preheader: string | null;
  status: string;
  senderId: string;
  totalRecip: number;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  sender: { email: string; fromName: string; verified: boolean } | null;
  recipientCount: number;
}

interface CampaignStats {
  totalRecip: number;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  pendingCount: number;
  status: string;
  recent: Array<{
    email: string;
    name: string | null;
    status: string;
    error: string | null;
    sentAt: string | null;
  }>;
}

const MERGE_TAGS = [
  { label: "{{name}}", value: "{{name}}" },
  { label: "{{first_name}}", value: "{{first_name}}" },
  { label: "{{email}}", value: "{{email}}" },
];

type EditorMode = "visual" | "html" | "markdown" | "preview";

/**
 * Best-effort conversion of an HTML body string to a markdown approximation.
 * Not exhaustive — covers headings, lists, strong/em, links, line breaks and
 * paragraphs. Anything unrecognized is stripped of its tags. Used when the
 * user switches from a Visual/HTML view into the Markdown editor so the
 * content carries over in a readable shape.
 */
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  // Normalize whitespace once, then walk through tag-based replacements.
  let s = html
    // Block-level boundaries first so subsequent replacements stay ordered.
    .replace(/<\/(h[1-6]|p|div|li|tr|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Headings → # / ## / ### etc.
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, t) => `# ${stripTags(t).trim()}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, t) => `## ${stripTags(t).trim()}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, t) => `### ${stripTags(t).trim()}\n`)
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, (_m, t) => `#### ${stripTags(t).trim()}\n`)
    // Inline emphasis.
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, c) => `**${c.trim()}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, c) => `*${c.trim()}*`)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, c) => `\`${c.trim()}\``)
    // Links: [text](href)
    .replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => `[${stripTags(text).trim()}](${href})`)
    // Images: ![alt](src)
    .replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, (_m, alt, src) => `![${alt}](${src})`)
    .replace(/<img\b[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, (_m, src) => `![](${src})`)
    // Lists: bullets first, then numbered. <ul>/<ol> tags become newlines.
    .replace(/<ul[^>]*>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ol[^>]*>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `- ${c.trim()}\n`)
    // Blockquote lines.
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) =>
      stripTags(c).trim().split("\n").map((l: string) => `> ${l}`).join("\n") + "\n")
    // Horizontal rules.
    .replace(/<hr\s*\/?>/gi, "\n---\n")
    // Drop any remaining tags we haven't converted.
    .replace(/<[^>]+>/g, "")
    // Decode a few common entities.
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Tidy whitespace.
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s;
}

function stripTags(html: string): string {
  return String(html).replace(/<[^>]+>/g, "");
}

export function CampaignEditor({ campaignId }: { campaignId: string }) {
  const isNew = campaignId === "new";
  const openCampaignEditor = useAppStore((s) => s.openCampaignEditor);
  const setSection = useAppStore((s) => s.setSection);

  const campaignUrl = isNew ? null : `/api/campaigns/${campaignId}`;
  const { data: campaign, loading, error } = useFetch<CampaignDetail>(campaignUrl);
  const { data: senders } = useFetch<Sender[]>("/api/senders");
  const { data: statsOverview } = useFetch<{ activeContacts: number }>("/api/stats");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<string>("html");
  const [senderId, setSenderId] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [mode, setMode] = useState<EditorMode>("visual");
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Populate fields when the campaign loads (or when switching to "new").
  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title || "");
      setSubject(campaign.subject || "");
      setPreheader(campaign.preheader || "");
      setContent(campaign.content || "");
      const ct = campaign.contentType === "html" ? "html" : "markdown";
      setContentType(ct);
      // Default to the matching editor view for the loaded content type.
      setMode(ct === "html" ? "visual" : "markdown");
    } else if (isNew) {
      setTitle("");
      setSubject("");
      setPreheader("");
      setContent("");
      setContentType("html");
      setMode("visual");
      setSenderId("");
    }
    setHydrated(true);
  }, [campaign, isNew]);

  // Stats panel — only relevant when the campaign has been (or is being) sent.
  const liveStatus = campaign?.status;
  const statsUrl =
    !isNew && (liveStatus === "sent" || liveStatus === "sending")
      ? `/api/campaigns/${campaignId}/stats`
      : null;
  const {
    data: stats,
    refetch: refetchStats,
  } = useFetch<CampaignStats>(statsUrl);

  // While the campaign is actively sending, poll stats every 3 seconds.
  useEffect(() => {
    if (liveStatus !== "sending") return;
    const t = setInterval(() => {
      refetchStats();
    }, 3000);
    return () => clearInterval(t);
  }, [liveStatus, refetchStats]);

  const canEdit =
    !campaign ||
    campaign.status === "draft" ||
    campaign.status === "failed";

  /**
   * Insert a merge tag at the cursor of whichever textarea is currently the
   * active editor (HTML or Markdown). For the Visual editor we rely on the
   * contentEditable's own selection and execCommand("insertText").
   */
  const insertMergeTagTextarea = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    tag: string
  ) => {
    const el = ref.current;
    if (!el) {
      setContent((c) => c + tag);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + tag + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tag.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertMergeTag = (tag: string) => {
    if (mode === "html") {
      insertMergeTagTextarea(htmlTextareaRef, tag);
    } else if (mode === "markdown") {
      insertMergeTagTextarea(mdTextareaRef, tag);
    } else if (mode === "visual") {
      // For the contentEditable editor: try execCommand("insertText"),
      // which preserves the caret position. Fallback: append to content.
      try {
        const ok = document.execCommand("insertText", false, tag);
        if (ok) return;
      } catch {
        /* fall through */
      }
      setContent((c) => c + tag);
    }
  };

  /**
   * Handle mode switches. When moving between HTML and Markdown formats we
   * convert the underlying `content` so nothing is lost. Visual ↔ HTML is
   * a pure view change (both edit the same HTML string).
   */
  const handleModeChange = (next: string) => {
    const nextMode = next as EditorMode;
    if (nextMode === mode) return;

    if (nextMode === "visual" || nextMode === "html") {
      // Target is HTML.
      if (contentType === "markdown") {
        const html = markdownToHtml(content);
        setContent(html);
        setContentType("html");
      }
      // If already html, nothing to convert — just switch view.
    } else if (nextMode === "markdown") {
      if (contentType === "html") {
        const md = htmlToMarkdown(content);
        setContent(md);
        setContentType("markdown");
      }
      // If already markdown, nothing to convert.
    }
    // "preview" never converts — it reads content as-is.
    setMode(nextMode);
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Add a title first.");
    if (!subject.trim()) return toast.error("Add a subject first.");
    if (!content.trim()) return toast.error("Add some content first.");
    if (!senderId) return toast.error("Pick a sender first.");

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        content,
        contentType,
        preheader: preheader.trim() || null,
        senderId,
      };
      if (isNew) {
        const created = await apiFetch<CampaignDetail>("/api/campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Draft saved");
        openCampaignEditor(created.id);
      } else {
        await apiFetch<CampaignDetail>(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Draft saved");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSendDialogOpen(false);
    if (isNew) {
      toast.error("Save the draft first before sending.");
      return;
    }
    setSending(true);
    try {
      const result = await apiFetch<{
        ok: boolean;
        totalRecip: number;
        sentCount: number;
        failedCount: number;
        warning?: string;
      }>(`/api/campaigns/${campaignId}/send`, { method: "POST" });
      toast.success(
        `Broadcast sent: ${result.sentCount} delivered, ${result.failedCount} failed.`,
        { description: result.warning }
      );
      // Force a full refresh of campaign + stats.
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not load campaign</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => openCampaignEditor(null)}
        >
          <ArrowLeft className="size-4" /> Back to campaigns
        </Button>
      </div>
    );
  }

  const senderList = senders || [];
  const activeContacts = statsOverview?.activeContacts ?? 0;
  const isSending = liveStatus === "sending";
  const isSent = liveStatus === "sent";
  const showStatsPanel = !isNew && (isSending || isSent) && !!stats;

  const sendDisabled =
    isNew ||
    !senderId ||
    !content.trim() ||
    !subject.trim() ||
    activeContacts === 0 ||
    isSending ||
    isSent;

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => openCampaignEditor(null)}
        >
          <ArrowLeft className="size-4" /> All campaigns
        </Button>
        {campaign && (
          <div className="flex items-center gap-2">
            <StatusBadge status={campaign.status} />
          </div>
        )}
      </div>

      {/* Stats panel — visible once sending/sent */}
      {showStatsPanel && stats ? (
        <StatsPanel stats={stats} isSending={isSending} />
      ) : null}

      {/* Sender warning */}
      {senderList.length === 0 && (
        <Alert>
          <MailWarning />
          <AlertTitle>No sender connected</AlertTitle>
          <AlertDescription>
            You need to add a Gmail sender before you can broadcast.{" "}
            <button
              className="underline font-medium"
              onClick={() => setSection("senders")}
            >
              Add a sender
            </button>
            .
          </AlertDescription>
        </Alert>
      )}

      {/* No recipients warning */}
      {activeContacts === 0 && hydrated && (
        <Alert>
          <MailWarning />
          <AlertTitle>No active contacts</AlertTitle>
          <AlertDescription>
            You have no active contacts to send to.{" "}
            <button
              className="underline font-medium"
              onClick={() => setSection("contacts")}
            >
              Add contacts
            </button>
            .
          </AlertDescription>
        </Alert>
      )}

      {/* Header fields */}
      <div className="bg-card border rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="campaign-title" className="text-xs uppercase tracking-wide text-muted-foreground">
            Title
          </Label>
          <Input
            id="campaign-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Q1 product update"
            disabled={!canEdit}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="campaign-subject" className="text-xs uppercase tracking-wide text-muted-foreground">
              Subject
            </Label>
            <Input
              id="campaign-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What we shipped this month"
              disabled={!canEdit}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="campaign-preheader" className="text-xs uppercase tracking-wide text-muted-foreground">
              Preheader
            </Label>
            <Input
              id="campaign-preheader"
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              placeholder="A quick peek inside this email"
              disabled={!canEdit}
            />
            <p className="text-[11px] text-muted-foreground">
              Shown in inbox preview next to the subject.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="campaign-sender" className="text-xs uppercase tracking-wide text-muted-foreground">
            Sender
          </Label>
          <Select
            value={senderId}
            onValueChange={setSenderId}
            disabled={!canEdit || senderList.length === 0}
          >
            <SelectTrigger id="campaign-sender" className="w-full">
              <SelectValue placeholder={senderList.length === 0 ? "No senders added" : "Pick a sender"} />
            </SelectTrigger>
            <SelectContent>
              {senderList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.fromName} &lt;{s.email}&gt;{!s.verified ? " · Not verified" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Body: Visual / HTML / Markdown / Preview */}
      <div className="bg-card border rounded-2xl p-5 flex flex-col gap-4">
        <Tabs value={mode} onValueChange={handleModeChange}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-serif text-lg text-foreground">Body</h3>
              <p className="text-xs text-muted-foreground">
                Write visually, hand-edit HTML, or use Markdown. Use merge tags to personalize per recipient.
              </p>
            </div>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="visual" disabled={!canEdit} className="gap-1.5">
                <PencilLine className="size-3.5" /> Visual
              </TabsTrigger>
              <TabsTrigger value="html" disabled={!canEdit} className="gap-1.5">
                <Code className="size-3.5" /> HTML
              </TabsTrigger>
              <TabsTrigger value="markdown" disabled={!canEdit} className="gap-1.5">
                <Type className="size-3.5" /> Markdown
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="size-3.5" /> Preview
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Visual WYSIWYG */}
          <TabsContent value="visual" className="mt-4">
            <div className="flex flex-col gap-3">
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  {MERGE_TAGS.map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full font-mono text-xs"
                      onClick={() => insertMergeTag(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              )}
              <RichTextEditor
                value={content}
                onChange={setContent}
                disabled={!canEdit || contentType !== "html"}
              />
            </div>
          </TabsContent>

          {/* Raw HTML source */}
          <TabsContent value="html" className="mt-4">
            <div className="flex flex-col gap-3">
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  {MERGE_TAGS.map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full font-mono text-xs"
                      onClick={() => insertMergeTag(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              )}
              <Textarea
                ref={htmlTextareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"<h1>Hello {{first_name}}</h1>\n<p>Here is what we shipped this month...</p>"}
                className="min-h-[320px] font-mono text-sm rounded-lg"
                disabled={!canEdit}
                spellCheck={false}
              />
            </div>
          </TabsContent>

          {/* Markdown */}
          <TabsContent value="markdown" className="mt-4">
            <div className="flex flex-col gap-3">
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  {MERGE_TAGS.map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full font-mono text-xs"
                      onClick={() => insertMergeTag(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              )}
              <Textarea
                ref={mdTextareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"# Hello {{first_name}},\n\nHere's what's new this month..."}
                className="min-h-[320px] font-mono text-sm rounded-lg"
                disabled={!canEdit}
              />
            </div>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview" className="mt-4">
            <EmailPreview
              subject={subject}
              preheader={preheader}
              content={content}
              contentType={contentType}
              fromName={
                senderList.find((s) => s.id === senderId)?.fromName || "Your newsletter"
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6">
        <div className="text-sm text-muted-foreground">
          Will send to <span className="font-medium text-foreground">{activeContacts}</span> active contacts.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleSave}
            disabled={saving || !canEdit}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save draft
          </Button>

          <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <Button
              className="rounded-full"
              disabled={sendDisabled || sending}
              onClick={() => setSendDialogOpen(true)}
            >
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" /> Send broadcast
                </>
              )}
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send to {activeContacts} recipients now?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will send the email from your Gmail account to every active
                  contact. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  disabled={sending}
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : "Send now"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

const PREVIEW_ARTICLE_CLASS = cn(
  "text-[15px] leading-relaxed text-foreground",
  "[&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-3",
  "[&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
  "[&_h3]:font-semibold [&_h3]:text-base [&_h3]:mt-4 [&_h3]:mb-2",
  "[&_p]:my-3",
  "[&_a]:underline [&_a]:font-medium",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3",
  "[&_li]:my-1",
  "[&_blockquote]:border-l-[3px] [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
  "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px] [&_code]:font-mono",
  "[&_hr]:my-5 [&_hr]:border-border",
  "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3",
  "[&_strong]:font-semibold"
);

function EmailPreview({
  subject,
  preheader,
  content,
  contentType,
  fromName,
}: {
  subject: string;
  preheader: string;
  content: string;
  contentType: string;
  fromName: string;
}) {
  if (!content.trim()) {
    return (
      <div className="border rounded-2xl p-10 text-center text-sm text-muted-foreground bg-muted/40">
        Nothing to preview yet. Start writing in the Visual, HTML, or Markdown tab.
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl bg-card border rounded-2xl p-8 shadow-sm">
      <div className="border-b pb-3 mb-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          From {fromName}
        </div>
        <div className="font-serif text-xl text-foreground mt-1">
          {subject || "(no subject)"}
        </div>
        {preheader && (
          <div className="text-xs text-muted-foreground mt-1">{preheader}</div>
        )}
      </div>
      <article className={PREVIEW_ARTICLE_CLASS}>
        {contentType === "html" ? (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <ReactMarkdown>{content}</ReactMarkdown>
        )}
      </article>
    </div>
  );
}

function StatsPanel({
  stats,
  isSending,
}: {
  stats: CampaignStats;
  isSending: boolean;
}) {
  const total = stats.totalRecip || 1;
  const percent = Math.round(((stats.sentCount + stats.failedCount) / total) * 100);
  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg text-foreground">Delivery</h3>
          <p className="text-xs text-muted-foreground">
            {isSending ? "Currently sending…" : "Broadcast complete"}
          </p>
        </div>
        <div className="text-right">
          <div className="font-serif text-2xl text-foreground">{percent}%</div>
          <div className="text-xs text-muted-foreground">
            {stats.sentCount + stats.failedCount} / {stats.totalRecip}
          </div>
        </div>
      </div>

      <Progress value={percent} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Sent" value={stats.sentCount} tone="success" />
        <StatTile label="Failed" value={stats.failedCount} tone="danger" />
        <StatTile label="Pending" value={stats.pendingCount} tone="neutral" />
      </div>

      {stats.recent.length > 0 && (
        <div className="mt-2">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Recent deliveries
          </h4>
          <div className="max-h-72 overflow-y-auto scroll-thin border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-3">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="pr-3 text-right">Sent at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent.map((r, i) => (
                  <TableRow key={`${r.email}-${i}`}>
                    <TableCell className="pl-3 font-medium max-w-[200px] truncate">
                      {truncate(r.email, 36)}
                    </TableCell>
                    <TableCell>
                      <RecipientStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {r.error || "—"}
                    </TableCell>
                    <TableCell className="pr-3 text-right text-xs text-muted-foreground">
                      {fmtDateTime(r.sentAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "bg-chart-1/10 text-chart-1"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-xl border p-3 flex flex-col gap-1">
      <span className={cn("inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wide", toneClass)}>
        {label}
      </span>
      <span className="font-serif text-xl text-foreground">{value}</span>
    </div>
  );
}
