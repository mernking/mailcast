"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Trash2,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ImportDialog } from "./import-dialog";

interface ContactItem {
  id: string;
  email: string;
  name: string | null;
  tags: string;
  source: string;
  active: boolean;
  createdAt: string;
}

interface ContactsResponse {
  items: ContactItem[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 50;

export function ContactList() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const url = `/api/contacts?page=${page}&limit=${PAGE_SIZE}${debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ""}`;
  const { data, loading, refetch } = useFetch<ContactsResponse>(url);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const confirmDelete = async () => {
    if (!deletingId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/contacts/${deletingId}`, { method: "DELETE" });
      toast.success("Contact deleted");
      setDeletingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <SectionHeading
        title="Contacts"
        description="Your subscriber list. Add individually, paste emails, or import a CSV."
        action={
          <>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" /> Import
            </Button>
            <Button className="rounded-full" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Add contact
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email, name, tag…"
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {total} total
        </div>
      </div>

      {loading && items.length === 0 ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={debouncedQ ? "No matching contacts" : "No contacts yet"}
          description={
            debouncedQ
              ? "Try a different search term, or clear the search to see everyone."
              : "Add your first subscriber, or paste in a list of emails to bulk-import."
          }
          actionLabel={debouncedQ ? undefined : "Import emails"}
          onAction={debouncedQ ? undefined : () => setImportOpen(true)}
        />
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="pl-4">Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4 font-medium">{c.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.name || "—"}
                    </TableCell>
                    <TableCell>
                      {c.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.split(",").map((t) => (
                            <Badge key={t} variant="secondary" className="font-normal">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.active ? (
                        <Badge variant="outline" className="border-transparent bg-chart-1/10 text-chart-1">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                          Unsubscribed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {fmtDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label="Delete contact"
                        onClick={() => setDeletingId(c.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </div>
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

      {/* Add contact dialog */}
      <AddContactDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => refetch()}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => refetch()}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be removed from your list and will no longer receive
              future broadcasts. This cannot be undone.
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

function AddContactDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEmail("");
    setName("");
    setTags("");
  };

  const submit = async () => {
    if (!email.trim()) return toast.error("Email is required");
    setSaving(true);
    try {
      await apiFetch("/api/contacts", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null, tags }),
      });
      toast.success("Contact added");
      reset();
      onOpenChange(false);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>
            Add a single subscriber. If the email already exists, their name and tags will be updated.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-email">Email</Label>
            <Input
              id="add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reader@example.com"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-name">Name (optional)</Label>
            <Input
              id="add-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Reader"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-tags">Tags (optional)</Label>
            <Input
              id="add-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="founders, weekly-digest"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
