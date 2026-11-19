"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Trash2, Pencil, Plus } from "lucide-react";
import { useFetch, apiFetch, fmtDate, truncate } from "../use-api";
import { useAppStore } from "@/hooks/use-app-store";
import { SectionHeading } from "../section-heading";
import { EmptyState } from "../empty-state";
import { StatusBadge } from "../status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2 } from "lucide-react";

interface CampaignListItem {
  id: string;
  title: string;
  subject: string;
  status: string;
  totalRecip: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt: string | null;
  sender: { email: string; fromName: string } | null;
}

export function CampaignList() {
  const { data, loading, refetch } = useFetch<CampaignListItem[]>("/api/campaigns");
  const openCampaignEditor = useAppStore((s) => s.openCampaignEditor);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const campaigns = data || [];

  const confirmDelete = async () => {
    if (!deletingId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/campaigns/${deletingId}`, { method: "DELETE" });
      toast.success("Campaign deleted");
      setDeletingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete campaign");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <SectionHeading
        title="Campaigns"
        description="Draft, edit, and broadcast newsletters from your Gmail account."
        action={
          <Button className="rounded-full" onClick={() => openCampaignEditor("new")}>
            <Plus className="size-4" /> New campaign
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No campaigns yet"
          description="Start a new draft. You can write in markdown, preview the email, and broadcast to all your active contacts."
          actionLabel="Create your first campaign"
          onAction={() => openCampaignEditor("new")}
        />
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent / Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-4 font-medium max-w-[240px] truncate">
                    {c.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[260px] truncate">
                    {truncate(c.subject || "—", 50)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.sentCount} / {c.totalRecip}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Edit campaign"
                        onClick={() => openCampaignEditor(c.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label="Delete campaign"
                        onClick={() => setDeletingId(c.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the campaign and all of its delivery
              records. This cannot be undone.
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
