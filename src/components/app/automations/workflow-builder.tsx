"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Loader2,
  Save,
  Plus,
  Trash2,
  Mail,
  Clock,
  GitBranch,
  MailWarning,
  Users,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { useFetch, apiFetch, fmtDateTime, truncate } from "../use-api";
import { useAppStore } from "@/hooks/use-app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { EnrollDialog } from "./enroll-dialog";

interface Sender {
  id: string;
  email: string;
  fromName: string;
  verified: boolean;
}

interface FormListItem {
  id: string;
  name: string;
}

interface EnrollmentRecent {
  contactEmail: string;
  status: string;
  currentStep: number;
  dueAt: string;
  error: string | null;
}

interface WorkflowDetail {
  id: string;
  name: string;
  trigger: "form_submit" | "contact_added" | "manual";
  triggerConfig: Record<string, unknown>;
  senderId: string;
  enabled: boolean;
  steps: Step[];
  createdAt: string;
  updatedAt: string;
  sender: { email: string; fromName: string } | null;
  enrolledCount: number;
  activeCount: number;
  completedCount: number;
  recent: EnrollmentRecent[];
}

type StepType = "send_email" | "wait" | "condition";

interface Step {
  id: string;
  type: StepType;
  config: Record<string, unknown>;
}

interface SendEmailConfig {
  subject: string;
  content: string;
  contentType: "markdown" | "html";
  preheader?: string;
}
interface WaitConfig {
  amount: number;
  unit: "minutes" | "hours" | "days";
}
interface ConditionConfig {
  type: "has_tag" | "no_tag";
  tag: string;
  branchTo?: number;
}

const TRIGGER_OPTIONS: {
  value: WorkflowDetail["trigger"];
  label: string;
  hint: string;
}[] = [
  {
    value: "form_submit",
    label: "Form submit",
    hint: "Runs when a contact submits a signup form.",
  },
  {
    value: "contact_added",
    label: "New contact",
    hint: "Runs whenever a new contact is added.",
  },
  {
    value: "manual",
    label: "Manual",
    hint: "Runs only when you enroll contacts by hand.",
  },
];

const MERGE_TAGS = ["{{name}}", "{{first_name}}", "{{email}}"];

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `step-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function defaultConfig(type: StepType): Record<string, unknown> {
  if (type === "send_email") {
    return {
      subject: "",
      content: "",
      contentType: "markdown",
      preheader: "",
    } as SendEmailConfig;
  }
  if (type === "wait") {
    return { amount: 1, unit: "days" } as WaitConfig;
  }
  return { type: "has_tag", tag: "", branchTo: undefined } as ConditionConfig;
}

export function WorkflowBuilder({
  workflowId,
  onSaved,
  onClose,
}: {
  workflowId: string | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isNew = workflowId === "new";
  const setSection = useAppStore((s) => s.setSection);

  const detailUrl = !isNew && workflowId ? `/api/workflows/${workflowId}` : null;
  const { data: detail, loading, error } = useFetch<WorkflowDetail>(detailUrl);
  const { data: senders } = useFetch<Sender[]>("/api/senders");
  const { data: forms } = useFetch<FormListItem[]>("/api/forms");

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<WorkflowDetail["trigger"]>("form_submit");
  const [triggerFormId, setTriggerFormId] = useState<string>("");
  const [senderId, setSenderId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [saving, setSaving] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  useEffect(() => {
    if (isNew) {
      setName("");
      setTrigger("form_submit");
      setTriggerFormId("");
      setSenderId("");
      setEnabled(true);
      setSteps([]);
      setHydrated(true);
      return;
    }
    if (detail) {
      setName(detail.name || "");
      setTrigger(detail.trigger || "form_submit");
      setTriggerFormId(
        typeof detail.triggerConfig?.formId === "string"
          ? (detail.triggerConfig.formId as string)
          : ""
      );
      setSenderId(detail.senderId || "");
      setEnabled(detail.enabled);
      // Normalize incoming steps: ensure each has an id and a config object.
      const incoming = Array.isArray(detail.steps) ? detail.steps : [];
      setSteps(
        incoming.map((s, i) => ({
          id: s.id || newId(),
          type: s.type,
          config:
            s.config && typeof s.config === "object" ? s.config : defaultConfig(s.type),
        }))
      );
      setHydrated(true);
    }
  }, [detail, isNew]);

  const senderList = senders || [];
  const formList = forms || [];

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Add a name first.");
      return;
    }
    if (!senderId) {
      toast.error("Pick a sender first.");
      return;
    }

    // Validate steps minimally.
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.type === "send_email") {
        const cfg = s.config as Partial<SendEmailConfig>;
        if (!cfg.subject?.trim()) {
          toast.error(`Step ${i + 1}: add a subject.`);
          return;
        }
        if (!cfg.content?.trim()) {
          toast.error(`Step ${i + 1}: add email content.`);
          return;
        }
      } else if (s.type === "wait") {
        const cfg = s.config as Partial<WaitConfig>;
        if (!cfg.amount || cfg.amount < 1) {
          toast.error(`Step ${i + 1}: set a wait duration.`);
          return;
        }
      } else if (s.type === "condition") {
        const cfg = s.config as Partial<ConditionConfig>;
        if (!cfg.tag?.trim()) {
          toast.error(`Step ${i + 1}: set a tag for the condition.`);
          return;
        }
      }
    }

    const triggerConfig =
      trigger === "form_submit" && triggerFormId
        ? JSON.stringify({ formId: triggerFormId })
        : "{}";

    const payload = {
      name: name.trim(),
      trigger,
      triggerConfig,
      senderId,
      steps: JSON.stringify(steps),
      enabled,
    };

    setSaving(true);
    try {
      if (isNew) {
        const created = await apiFetch<WorkflowDetail>("/api/workflows", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Workflow created");
        onSaved();
        // Switch to editing the freshly-created workflow.
        // The parent will re-render with the new id once we close.
        // Simpler: just call onClose and let the list refresh.
        onClose();
      } else if (workflowId) {
        await apiFetch<WorkflowDetail>(`/api/workflows/${workflowId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Workflow saved");
        onSaved();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && loading) {
    return (
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!isNew && error) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <Alert variant="destructive">
          <AlertTitle>Could not load workflow</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="ghost" className="mt-4" onClick={onClose}>
          <ArrowLeft className="size-4" /> All workflows
        </Button>
      </div>
    );
  }

  const isManual = trigger === "manual";

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={onClose}
        >
          <ArrowLeft className="size-4" /> All workflows
        </Button>
        <div className="flex items-center gap-2">
          {isManual && !isNew && (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setEnrollOpen(true)}
              disabled={!enabled}
            >
              <Users className="size-4" /> Enroll contacts
            </Button>
          )}
          <Button className="rounded-full" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isNew ? "Create workflow" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Sender warning */}
      {senderList.length === 0 && (
        <Alert>
          <MailWarning />
          <AlertTitle>No sender connected</AlertTitle>
          <AlertDescription>
            You need to add a Gmail sender before this workflow can send emails.{" "}
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

      {/* Settings card */}
      <div className="bg-card border rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <Label
              htmlFor="workflow-name"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Name
            </Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Welcome email sequence"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Label htmlFor="workflow-enabled" className="text-sm">
              {enabled ? "Enabled" : "Paused"}
            </Label>
            <Switch
              id="workflow-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Trigger
            </Label>
            <Select
              value={trigger}
              onValueChange={(v) =>
                setTrigger(v as WorkflowDetail["trigger"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {TRIGGER_OPTIONS.find((o) => o.value === trigger)?.hint}
            </p>
          </div>

          {trigger === "form_submit" ? (
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Form
              </Label>
              <Select
                value={triggerFormId}
                onValueChange={setTriggerFormId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      formList.length === 0 ? "No forms yet" : "Pick a form"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {formList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only submissions of this form will trigger the workflow.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Sender
              </Label>
              <Select
                value={senderId}
                onValueChange={setSenderId}
                disabled={senderList.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      senderList.length === 0
                        ? "No senders added"
                        : "Pick a sender"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {senderList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fromName} &lt;{s.email}&gt;
                      {!s.verified ? " · Not verified" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {trigger === "form_submit" && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Sender
            </Label>
            <Select
              value={senderId}
              onValueChange={setSenderId}
              disabled={senderList.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    senderList.length === 0
                      ? "No senders added"
                      : "Pick a sender"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {senderList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fromName} &lt;{s.email}&gt;
                    {!s.verified ? " · Not verified" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Steps builder */}
      <StepsBuilder steps={steps} onChange={setSteps} />

      {/* Stats (only when editing existing) */}
      {!isNew && detail && hydrated && (
        <WorkflowStats detail={detail} />
      )}

      <div className="h-6" />

      {/* Enroll dialog (manual only) */}
      {isManual && !isNew && workflowId && (
        <EnrollDialog
          workflowId={enrollOpen ? workflowId : null}
          onClose={() => setEnrollOpen(false)}
          onDone={onSaved}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps builder                                                              */
/* -------------------------------------------------------------------------- */

function StepsBuilder({
  steps,
  onChange,
}: {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}) {
  const addStep = (type: StepType) => {
    onChange([
      ...steps,
      { id: newId(), type, config: defaultConfig(type) },
    ]);
  };

  const removeStep = (id: string) => {
    onChange(steps.filter((s) => s.id !== id));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const next = steps.slice();
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const updateConfig = (id: string, patch: Record<string, unknown>) => {
    onChange(
      steps.map((s) =>
        s.id === id ? { ...s, config: { ...s.config, ...patch } } : s
      )
    );
  };

  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-serif text-lg text-foreground">Steps</h3>
          <p className="text-xs text-muted-foreground">
            Steps run top-to-bottom. Wait steps pause until the delay elapses.
          </p>
        </div>
        {steps.length > 0 && (
          <Badge variant="outline" className="rounded-full">
            {steps.length} step{steps.length === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {steps.length === 0 ? (
        <div className="border border-dashed rounded-xl p-8 text-center">
          <WorkflowIcon className="size-6 mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Add steps to build your workflow.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              index={idx}
              total={steps.length}
              allSteps={steps}
              onRemove={() => removeStep(step.id)}
              onMove={(dir) => moveStep(idx, dir)}
              onConfigChange={(patch) => updateConfig(step.id, patch)}
            />
          ))}
        </ol>
      )}

      {/* Flow preview */}
      {steps.length > 0 && <FlowPreview steps={steps} />}

      <Separator />

      {/* Add-step buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => addStep("send_email")}
        >
          <Plus className="size-3.5" /> Send email
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => addStep("wait")}
        >
          <Plus className="size-3.5" /> Wait
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => addStep("condition")}
        >
          <Plus className="size-3.5" /> Condition
        </Button>
      </div>
    </div>
  );
}

const STEP_ICONS: Record<StepType, typeof Mail> = {
  send_email: Mail,
  wait: Clock,
  condition: GitBranch,
};

const STEP_LABELS: Record<StepType, string> = {
  send_email: "Send email",
  wait: "Wait",
  condition: "Condition",
};

function StepCard({
  step,
  index,
  total,
  allSteps,
  onRemove,
  onMove,
  onConfigChange,
}: {
  step: Step;
  index: number;
  total: number;
  allSteps: Step[];
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onConfigChange: (patch: Record<string, unknown>) => void;
}) {
  const Icon = STEP_ICONS[step.type];

  return (
    <li className="border rounded-xl bg-background/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-6 rounded-md bg-foreground/5 text-muted-foreground inline-flex items-center justify-center text-xs font-mono shrink-0">
            {index + 1}
          </span>
          <Icon className="size-4 text-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {STEP_LABELS[step.type]}
          </span>
          <StepSummary step={step} allSteps={allSteps} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove step"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-4">
        {step.type === "send_email" && (
          <SendEmailEditor
            cfg={step.config as unknown as SendEmailConfig}
            onChange={onConfigChange}
          />
        )}
        {step.type === "wait" && (
          <WaitEditor
            cfg={step.config as unknown as WaitConfig}
            onChange={onConfigChange}
          />
        )}
        {step.type === "condition" && (
          <ConditionEditor
            cfg={step.config as unknown as ConditionConfig}
            index={index}
            allSteps={allSteps}
            onChange={onConfigChange}
          />
        )}
      </div>
    </li>
  );
}

function StepSummary({
  step,
  allSteps,
}: {
  step: Step;
  allSteps: Step[];
}) {
  let text = "";
  if (step.type === "send_email") {
    const cfg = step.config as Partial<SendEmailConfig>;
    text = cfg.subject ? `: ${truncate(cfg.subject, 36)}` : "";
  } else if (step.type === "wait") {
    const cfg = step.config as Partial<WaitConfig>;
    if (cfg.amount && cfg.unit) {
      text = `: ${cfg.amount} ${cfg.unit}`;
    }
  } else if (step.type === "condition") {
    const cfg = step.config as Partial<ConditionConfig>;
    if (cfg.tag) {
      text = `: ${cfg.type === "has_tag" ? "has" : "missing"} tag "${truncate(cfg.tag, 20)}"`;
    }
  }
  if (!text) return null;
  return (
    <span className="text-xs text-muted-foreground truncate">
      {text}
      {step.type === "condition" &&
        (step.config as Partial<ConditionConfig>).branchTo != null && (
          <>
            {" "}
            → step{" "}
            {((step.config as Partial<ConditionConfig>).branchTo ?? 0) + 1}
          </>
        )}
    </span>
  );
}

/* ------------------------------ Send email ------------------------------- */

function SendEmailEditor({
  cfg,
  onChange,
}: {
  cfg: SendEmailConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMergeTag = (tag: string) => {
    const el = textareaRef.current;
    const current = cfg.content || "";
    if (!el) {
      onChange({ content: current + tag });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + tag + current.slice(end);
    onChange({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tag.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const contentType = cfg.contentType === "html" ? "html" : "markdown";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Subject</Label>
        <Input
          value={cfg.subject || ""}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Welcome to MailCast!"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Preheader</Label>
          <Input
            value={cfg.preheader || ""}
            onChange={(e) => onChange({ preheader: e.target.value })}
            placeholder="A short inbox preview line"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Format</Label>
          <Select
            value={contentType}
            onValueChange={(v) => onChange({ contentType: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="text-xs text-muted-foreground">Content</Label>
          <div className="flex items-center gap-1">
            {MERGE_TAGS.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full h-6 px-2 font-mono text-[11px]"
                onClick={() => insertMergeTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
        <Textarea
          ref={textareaRef}
          value={cfg.content || ""}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder={
            contentType === "html"
              ? "<h1>Welcome!</h1>\n<p>Thanks for joining.</p>"
              : "# Welcome!\n\nThanks for joining."
          }
          className={cn(
            "min-h-[180px] text-sm rounded-lg",
            contentType === "html" ? "font-mono" : ""
          )}
        />
      </div>
    </div>
  );
}

/* --------------------------------- Wait ---------------------------------- */

function WaitEditor({
  cfg,
  onChange,
}: {
  cfg: WaitConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const amount = Number(cfg.amount) || 1;
  const unit = cfg.unit || "days";
  return (
    <div className="grid sm:grid-cols-2 gap-3 max-w-md">
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Amount</Label>
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => onChange({ amount: Math.max(1, Number(e.target.value) || 1) })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Unit</Label>
        <Select
          value={unit}
          onValueChange={(v) =>
            onChange({ unit: v as WaitConfig["unit"] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Will wait {amount} {unit} before running the next step.
      </p>
    </div>
  );
}

/* ------------------------------ Condition -------------------------------- */

function ConditionEditor({
  cfg,
  index,
  allSteps,
  onChange,
}: {
  cfg: ConditionConfig;
  index: number;
  allSteps: Step[];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const type = cfg.type === "no_tag" ? "no_tag" : "has_tag";
  const tag = cfg.tag || "";
  const branchTo = cfg.branchTo;

  // Other step indices this condition can branch to.
  const otherSteps = allSteps
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => i !== index);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => onChange({ type: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="has_tag">Has tag</SelectItem>
              <SelectItem value="no_tag">Missing tag</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Tag</Label>
          <Input
            value={tag}
            onChange={(e) => onChange({ tag: e.target.value })}
            placeholder="e.g. vip"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">
          If condition is met, jump to
        </Label>
        <Select
          value={branchTo == null ? "continue" : String(branchTo)}
          onValueChange={(v) =>
            onChange({
              branchTo: v === "continue" ? undefined : Number(v),
            })
          }
        >
          <SelectTrigger className="w-full sm:max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="continue">
              Continue to next step
            </SelectItem>
            {otherSteps.map(({ s, i }) => (
              <SelectItem key={s.id} value={String(i)}>
                Step {i + 1}: {STEP_LABELS[s.type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          When the contact {type === "has_tag" ? "has" : "does not have"} tag{" "}
          <span className="font-medium text-foreground">
            {tag || "(unset)"}
          </span>
          , the workflow will{" "}
          {branchTo == null
            ? "continue to the next step."
            : `jump to step ${branchTo + 1}.`}{" "}
          Otherwise it continues to the next step.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Flow preview ------------------------------ */

function FlowPreview({ steps }: { steps: Step[] }) {
  return (
    <div className="mt-2 rounded-xl border bg-background/40 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
        Flow
      </div>
      <div className="flex flex-col">
        {steps.map((step, idx) => {
          const Icon = STEP_ICONS[step.type];
          const last = idx === steps.length - 1;
          return (
            <div key={step.id} className="flex items-stretch gap-3">
              {/* Connector column */}
              <div className="flex flex-col items-center self-stretch">
                <div className="size-7 rounded-full border-2 border-foreground/30 bg-card flex items-center justify-center text-foreground shrink-0">
                  <Icon className="size-3.5" />
                </div>
                {!last && (
                  <div className="flex-1 w-px bg-foreground/15 min-h-[14px]" />
                )}
              </div>
              <div className="py-1 text-sm">
                <span className="text-muted-foreground">Step {idx + 1}</span>{" "}
                <span className="text-foreground font-medium">
                  {STEP_LABELS[step.type]}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  {summaryText(step)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function summaryText(step: Step): string {
  if (step.type === "send_email") {
    const cfg = step.config as Partial<SendEmailConfig>;
    return cfg.subject ? `— "${truncate(cfg.subject, 50)}"` : "(no subject)";
  }
  if (step.type === "wait") {
    const cfg = step.config as Partial<WaitConfig>;
    return cfg.amount && cfg.unit ? `— ${cfg.amount} ${cfg.unit}` : "";
  }
  if (step.type === "condition") {
    const cfg = step.config as Partial<ConditionConfig>;
    if (!cfg.tag) return "(no tag)";
    const verb = cfg.type === "has_tag" ? "has tag" : "missing tag";
    const jump =
      cfg.branchTo != null ? ` → jump to step ${cfg.branchTo + 1}` : "";
    return `— if ${verb} "${truncate(cfg.tag, 20)}"${jump}`;
  }
  return "";
}

/* ------------------------------ Stats panel ------------------------------ */

function WorkflowStats({ detail }: { detail: WorkflowDetail }) {
  const recent = detail.recent || [];
  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-serif text-lg text-foreground">Enrollments</h3>
          <p className="text-xs text-muted-foreground">
            Live progress through this workflow.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <StatPill label="Enrolled" value={detail.enrolledCount} />
          <StatPill label="Active" value={detail.activeCount} tone="amber" />
          <StatPill
            label="Completed"
            value={detail.completedCount}
            tone="green"
          />
        </div>
      </div>

      {recent.length === 0 ? (
        <div className="border border-dashed rounded-xl p-6 text-center text-sm text-muted-foreground">
          No enrollments yet.{" "}
          {detail.trigger === "manual"
            ? "Use \"Enroll contacts\" to add some."
            : "Triggered automatically when contacts join or submit a form."}
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto scroll-thin border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-3">Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Step</TableHead>
                <TableHead className="pr-3 text-right">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((r, i) => (
                <TableRow key={`${r.contactEmail}-${i}`}>
                  <TableCell className="pl-3 font-medium max-w-[200px] truncate">
                    {truncate(r.contactEmail, 36)}
                  </TableCell>
                  <TableCell>
                    <EnrollmentStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.currentStep + 1}
                  </TableCell>
                  <TableCell className="pr-3 text-right text-xs text-muted-foreground">
                    {r.status === "failed" && r.error
                      ? truncate(r.error, 30)
                      : fmtDateTime(r.dueAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "amber" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-chart-4/15 text-chart-5"
      : tone === "green"
        ? "bg-chart-1/10 text-chart-1"
        : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${toneClass}`}
      >
        {label}
      </span>
      <span className="font-serif text-base text-foreground">{value}</span>
    </div>
  );
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const toneClass =
    status === "completed"
      ? "border-transparent bg-chart-1/10 text-chart-1"
      : status === "failed"
        ? "border-transparent bg-destructive/10 text-destructive"
        : "border-transparent bg-chart-4/15 text-chart-5";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="outline" className={cn("capitalize", toneClass)}>
      {label}
    </Badge>
  );
}
