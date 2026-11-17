"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { useFetch, fmtDateTime, truncate } from "../use-api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FormFull, FormSubmissionsResponse, FormSubmission } from "./types";

interface SubmissionsDialogProps {
  formId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const PAGE_SIZE = 25;

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildCsv(
  form: FormFull | undefined,
  items: FormSubmission[]
): string {
  if (!form) return "";
  // Collect every extra field key that appears across submissions (excluding
  // email/name which get their own columns, plus the form's declared fields).
  const extraKeys = new Set<string>();
  for (const it of items) {
    for (const k of Object.keys(it.data)) {
      if (k === "email" || k === "name") continue;
      extraKeys.add(k);
    }
  }
  const orderedExtra = Array.from(extraKeys).sort();
  const header = [
    "email",
    "name",
    ...orderedExtra,
    "submitted_at",
  ];
  const rows = items.map((it) => [
    csvCell(it.email),
    csvCell(it.name),
    ...orderedExtra.map((k) => csvCell(it.data[k])),
    csvCell(it.createdAt),
  ]);
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function SubmissionsDialog({
  formId,
  open,
  onOpenChange,
}: SubmissionsDialogProps) {
  const [page, setPage] = useState(1);

  const formUrl = formId ? `/api/forms/${formId}` : null;
  const { data: form, loading: formLoading } = useFetch<FormFull>(formUrl);

  const subsUrl = formId
    ? `/api/forms/${formId}/submissions?page=${page}&limit=${PAGE_SIZE}`
    : null;
  const { data, loading } = useFetch<FormSubmissionsResponse>(subsUrl);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const csv = useMemo(
    () => buildCsv(form, items),
    [form, items]
  );

  const downloadCsv = () => {
    if (!form || items.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = form.name.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
    a.href = url;
    a.download = `${safeName || "form"}-submissions.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} submission${items.length === 1 ? "" : "s"}`);
  };

  const loadingView = loading && items.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="font-serif text-xl">
            Submissions
            {form ? (
              <span className="text-muted-foreground font-sans text-sm font-normal ml-2">
                {form.name}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Every submission is stored as a contact and triggers any matching
            automations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {formLoading && !form ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : loadingView ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="ml-2 text-sm">Loading submissions…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Inbox}
                title="No submissions yet"
                description="Once someone fills out your embedded form, their submission will show up here."
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b">
                <span className="text-xs text-muted-foreground">
                  {total} total
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={downloadCsv}
                >
                  <Download className="size-3.5" /> Download CSV
                </Button>
              </div>
              <div className="overflow-y-auto scroll-thin max-h-[55vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="pl-6">Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Extra data</TableHead>
                      <TableHead className="pr-6">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((s) => {
                      const extras = Object.entries(s.data).filter(
                        ([k]) => k !== "email"
                      );
                      const extraText = extras
                        .map(([k, v]) => `${k}: ${truncate(String(v ?? ""), 30)}`)
                        .join(", ");
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="pl-6 font-medium">
                            {s.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {s.name || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {extraText || "—"}
                          </TableCell>
                          <TableCell className="pr-6 text-muted-foreground text-xs whitespace-nowrap">
                            {fmtDateTime(s.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-4" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
