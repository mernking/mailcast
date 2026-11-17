"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  Trash2,
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import { useFetch, apiFetch, fmtDate } from "../use-api";
import { SectionHeading } from "../section-heading";
import { EmptyState } from "../empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AddSenderDialog } from "./add-sender-dialog";

interface Sender {
  id: string;
  email: string;
  fromName: string;
  verified: boolean;
  createdAt: string;
}

interface SenderListProps {
  addDialogOpen: boolean;
  onAddDialogChange: (o: boolean) => void;
}

export function SenderList({ addDialogOpen, onAddDialogChange }: SenderListProps) {
  const { data, loading, refetch } = useFetch<Sender[]>("/api/senders");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const senders = data || [];

  const confirmDelete = async () => {
    if (!deletingId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/senders/${deletingId}`, { method: "DELETE" });
      toast.success("Sender removed");
      setDeletingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete sender");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <SectionHeading
        title="Senders"
        description="The Gmail accounts you broadcast from. We use app passwords and store them encrypted."
        action={
          <Button className="rounded-full" onClick={() => onAddDialogChange(true)}>
            <Plus className="size-4" /> Add Gmail sender
          </Button>
        }
      />

      {loading && senders.length === 0 ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : senders.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No Gmail senders yet"
          description="Add a Gmail account with an app password to start broadcasting. Your password is encrypted with AES-256-GCM and never sent back to the client."
          actionLabel="Add Gmail sender"
          onAction={() => onAddDialogChange(true)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {senders.map((s) => (
            <SenderCard
              key={s.id}
              sender={s}
              onTest={() => setTestingId(s.id)}
              onDelete={() => setDeletingId(s.id)}
            />
          ))}
        </div>
      )}

      {/* Inline help when senders exist */}
      {senders.length > 0 && (
        <div className="bg-muted rounded-2xl p-4 text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">App passwords:</strong> create one
          at{" "}
          <a
            href="https://myaccount.google.com/security"
            target="_blank"
            rel="noreferrer"
            className="underline font-medium"
          >
            myaccount.google.com
          </a>{" "}
          → Security → 2-Step Verification → App passwords. Paste the 16-character
          password when adding a sender.
        </div>
      )}

      <AddSenderDialog
        open={addDialogOpen}
        onOpenChange={onAddDialogChange}
        onSaved={() => refetch()}
      />

      <TestSenderDialog
        senderId={testingId}
        onClose={() => setTestingId(null)}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this sender?</AlertDialogTitle>
            <AlertDialogDescription>
              The sender account will be deleted. Campaigns that reference this
              sender must be deleted first.
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

function SenderCard({
  sender,
  onTest,
  onDelete,
}: {
  sender: Sender;
  onTest: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Mail className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground truncate">
                {sender.fromName}
              </span>
              {sender.verified ? (
                <Badge variant="outline" className="border-transparent bg-chart-1/10 text-chart-1">
                  <CheckCircle2 className="size-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="border-transparent bg-destructive/10 text-destructive">
                  <XCircle className="size-3" /> Not verified
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground truncate">{sender.email}</div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>App password stored &middot; {"•".repeat(16)}</span>
              <span>Added {fmtDate(sender.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onTest}>
            <FlaskConical className="size-3.5" /> Test
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            aria-label="Delete sender"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TestSenderDialog({
  senderId,
  onClose,
}: {
  senderId: string | null;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!senderId) return;
    if (!to.trim()) return toast.error("Enter a recipient email");
    setSending(true);
    try {
      const result = await apiFetch<{ ok: boolean; error?: string }>(
        `/api/senders/${senderId}/test`,
        { method: "POST", body: JSON.stringify({ to: to.trim() }) }
      );
      if (result.ok) {
        toast.success("Test email sent", { description: `Delivered to ${to}` });
        setTo("");
        onClose();
      } else {
        toast.error(result.error || "Test email failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test email failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!senderId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a test email</DialogTitle>
          <DialogDescription>
            We will send a one-off email from this sender to the address you enter below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-to">Recipient email</Label>
          <Input
            id="test-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={sending}>
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FlaskConical className="size-4" />
            )}
            Send test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
