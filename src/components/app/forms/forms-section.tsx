"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Code2,
  ListOrdered,
  Trash2,
  RectangleHorizontal,
  Loader2,
} from "lucide-react";
import { useFetch, apiFetch, fmtDate } from "../use-api";
import { SectionHeading } from "../section-heading";
import { EmptyState } from "../empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { FormBuilder } from "./form-builder";
import { EmbedDialog } from "./embed-dialog";
import { SubmissionsDialog } from "./submissions-dialog";
import { FormPreview } from "./form-preview";
import type { FormSummary } from "./types";

export function FormsSection() {
  const { data, loading, refetch } = useFetch<FormSummary[]>("/api/forms");
  const forms = data || [];

  // Builder dialog. null = closed, "new" = create mode, real id = edit mode.
  const [editing, setEditing] = useState<string | null>(null);
  const [embedForId, setEmbedForId] = useState<string | null>(null);
  const [submissionsForId, setSubmissionsForId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    if (!deletingId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/forms/${deletingId}`, { method: "DELETE" });
      toast.success("Form deleted");
      setDeletingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete form");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <SectionHeading
        title="Forms"
        description="Design signup forms, embed them anywhere, and grow your list."
        action={
          <Button
            className="rounded-full"
            onClick={() => setEditing("new")}
          >
            <Plus className="size-4" /> New form
          </Button>
        }
      />

      {loading && forms.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={RectangleHorizontal}
          title="No forms yet"
          description="Create a signup form, embed it on your site, and every submission becomes a contact."
          actionLabel="Create your first form"
          onAction={() => setEditing("new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((f) => (
            <FormCard
              key={f.id}
              form={f}
              onEdit={() => setEditing(f.id)}
              onEmbed={() => setEmbedForId(f.id)}
              onSubmissions={() => setSubmissionsForId(f.id)}
              onDelete={() => setDeletingId(f.id)}
            />
          ))}
        </div>
      )}

      {/* Builder */}
      <FormBuilder
        formId={editing}
        onClose={() => setEditing(null)}
        onSaved={(savedId, openEmbed) => {
          setEditing(null);
          refetch();
          if (openEmbed) setEmbedForId(savedId);
        }}
      />

      {/* Embed */}
      <EmbedDialog
        formId={embedForId}
        open={embedForId !== null}
        onOpenChange={(o) => !o && setEmbedForId(null)}
      />

      {/* Submissions */}
      <SubmissionsDialog
        formId={submissionsForId}
        open={submissionsForId !== null}
        onOpenChange={(o) => !o && setSubmissionsForId(null)}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              The form and all of its submissions will be permanently removed.
              Existing contacts created by this form are kept.
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
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormCard({
  form,
  onEdit,
  onEmbed,
  onSubmissions,
  onDelete,
}: {
  form: FormSummary;
  onEdit: () => void;
  onEmbed: () => void;
  onSubmissions: () => void;
  onDelete: () => void;
}) {
  const tags = form.tagsToAdd
    ? form.tagsToAdd
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-serif text-lg text-foreground leading-tight truncate">
            {form.name}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{form.submissionCount} submission{form.submissionCount === 1 ? "" : "s"}</span>
            <span aria-hidden>·</span>
            <span>Created {fmtDate(form.createdAt)}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive shrink-0"
          aria-label="Delete form"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Mini preview */}
      <div className="rounded-xl bg-muted/40 p-3 flex justify-center">
        <FormPreview
          fields={form.fields}
          buttonText={form.buttonText}
          accentColor={form.accentColor}
          backgroundColor={form.backgroundColor}
          textColor={form.textColor}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 min-h-[20px]">
        {tags.length > 0 ? (
          tags.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="font-normal text-[11px]"
            >
              {t}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No tags</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full flex-1"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full flex-1"
          onClick={onEmbed}
        >
          <Code2 className="size-3.5" /> Embed
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full flex-1"
          onClick={onSubmissions}
        >
          <ListOrdered className="size-3.5" /> Submissions
        </Button>
      </div>
    </div>
  );
}
