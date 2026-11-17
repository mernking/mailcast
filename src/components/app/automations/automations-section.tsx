"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Workflow,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Users,
  Clock,
  CheckCircle2,
  Mail,
  MousePointerClick,
  UserPlus,
} from "lucide-react";
import { useFetch, apiFetch, fmtDate } from "../use-api";
import { SectionHeading } from "../section-heading";
import { EmptyState } from "../empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkflowBuilder } from "./workflow-builder";
import { EnrollDialog } from "./enroll-dialog";

interface WorkflowListItem {
  id: string;
  name: string;
  trigger: "form_submit" | "contact_added" | "manual";
  triggerConfig: Record<string, unknown>;
  enabled: boolean;
  enrolledCount: number;
  completedCount: number;
  stepCount: number;
  createdAt: string;
  sender: { email: string; fromName: string } | null;
}

const TRIGGER_META: Record<
  WorkflowListItem["trigger"],
  { label: string; icon: typeof MousePointerClick }
> = {
  form_submit: { label: "Form submit", icon: MousePointerClick },
  contact_added: { label: "New contact", icon: UserPlus },
  manual: { label: "Manual", icon: Users },
};

export function AutomationsSection() {
  const { data, loading, refetch } = useFetch<WorkflowListItem[]>("/api/workflows");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const workflows = data || [];

  if (editingId !== null) {
    return (
      <WorkflowBuilder
        workflowId={editingId}
        onSaved={() => refetch()}
        onClose={() => setEditingId(null)}
      />
    );
  }

  const confirmDelete = async () => {
    if (!deletingId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/workflows/${deletingId}`, { method: "DELETE" });
      toast.success("Workflow deleted");
      setDeletingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workflow");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <SectionHeading
        title="Automations"
        description="Welcome emails, drip sequences, and triggered workflows — sent from your Gmail."
        action={
          <Button className="rounded-full" onClick={() => setEditingId("new")}>
            <Plus className="size-4" /> New workflow
          </Button>
        }
      />

      {loading && workflows.length === 0 ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No automations yet"
          description="Build a welcome email, a drip sequence, or a tag-based flow. Triggered when contacts join or submit a form."
          actionLabel="Create your first workflow"
          onAction={() => setEditingId("new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              onToggle={(enabled) => toggleEnabled(wf, enabled, refetch)}
              onEdit={() => setEditingId(wf.id)}
              onEnroll={() => setEnrollingId(wf.id)}
              onDelete={() => setDeletingId(wf.id)}
            />
          ))}
        </div>
      )}

      <EnrollDialog
        workflowId={enrollingId}
        onClose={() => setEnrollingId(null)}
        onDone={() => refetch()}
      />

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              The workflow and all its enrollments will be permanently removed.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

async function toggleEnabled(
  wf: WorkflowListItem,
  enabled: boolean,
  refetch: () => void
) {
  try {
    await apiFetch(`/api/workflows/${wf.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
    toast.success(enabled ? "Workflow enabled" : "Workflow paused");
    refetch();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to toggle workflow");
  }
}

function WorkflowCard({
  workflow,
  onToggle,
  onEdit,
  onEnroll,
  onDelete,
}: {
  workflow: WorkflowListItem;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onEnroll: () => void;
  onDelete: () => void;
}) {
  const meta = TRIGGER_META[workflow.trigger];
  const TriggerIcon = meta.icon;
  const activeCount = Math.max(
    0,
    workflow.enrolledCount - workflow.completedCount
  );

  return (
    <div
      className="bg-card border rounded-2xl p-5 flex flex-col gap-4 shadow-sm cursor-pointer hover:shadow-md hover:border-foreground/20 transition-shadow"
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Workflow className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground truncate">
                {workflow.name}
              </span>
              {!workflow.enabled && (
                <Badge
                  variant="outline"
                  className="border-transparent bg-muted text-muted-foreground"
                >
                  Paused
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <TriggerIcon className="size-3.5" />
              <span>{meta.label}</span>
              {workflow.sender && (
                <>
                  <span aria-hidden>·</span>
                  <Mail className="size-3.5" />
                  <span className="truncate">{workflow.sender.email}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={workflow.enabled}
            onCheckedChange={onToggle}
            aria-label={workflow.enabled ? "Pause workflow" : "Enable workflow"}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat
          icon={<Workflow className="size-3.5" />}
          label="Steps"
          value={workflow.stepCount}
        />
        <Stat
          icon={<Clock className="size-3.5" />}
          label="Active"
          value={activeCount}
          tone="amber"
        />
        <Stat
          icon={<CheckCircle2 className="size-3.5" />}
          label="Done"
          value={workflow.completedCount}
          tone="green"
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t">
        <div className="text-xs text-muted-foreground">
          Created {fmtDate(workflow.createdAt)}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full h-8"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
          {workflow.trigger === "manual" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8"
              onClick={onEnroll}
              disabled={!workflow.enabled}
            >
              <Users className="size-3.5" /> Enroll
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            aria-label="Delete workflow"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
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
    <div className="rounded-lg border bg-background/50 p-2 flex flex-col gap-0.5">
      <div
        className={`inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${toneClass}`}
      >
        {icon}
        {label}
      </div>
      <span className="font-serif text-lg text-foreground leading-none">
        {value}
      </span>
    </div>
  );
}
