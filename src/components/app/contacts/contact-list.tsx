"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  MoreHorizontal,
  Pencil,
  FolderPlus,
  UserPlus,
  X,
  Hash,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportDialog } from "./import-dialog";

interface ContactItem {
  id: string;
  email: string;
  name: string | null;
  tags: string;
  source: string;
  active: boolean;
  telegram?: string | null;
  createdAt: string;
}

interface ContactsResponse {
  items: ContactItem[];
  total: number;
  page: number;
  limit: number;
}

interface GroupItem {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  formId?: string | null;
  formName?: string | null;
  contactCount: number;
  createdAt: string;
}

const PAGE_SIZE = 50;
const ALL_SENTINEL = "__all__";

export function ContactList() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Active group filter: ALL_SENTINEL means "all contacts".
  const [activeGroupId, setActiveGroupId] = useState<string>(ALL_SENTINEL);

  // Group editor dialog (create / edit). Holds the group being edited.
  const [editingGroup, setEditingGroup] = useState<GroupItem | null | "new">(
    null
  );
  const [deletingGroup, setDeletingGroup] = useState<GroupItem | null>(null);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page when the active group changes.
  useEffect(() => {
    setPage(1);
  }, [activeGroupId]);

  // Fetch the groups rail. Stays mounted for the lifetime of the list.
  const { data: groupsData, refetch: refetchGroups } = useFetch<GroupItem[]>(
    "/api/groups"
  );
  const groups = groupsData || [];

  // Fetch the contacts — from the group endpoint when a group is selected,
  // or from the regular contacts endpoint when "All" is selected.
  const contactsUrl =
    activeGroupId === ALL_SENTINEL
      ? `/api/contacts?page=${page}&limit=${PAGE_SIZE}${
          debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ""
        }`
      : `/api/groups/${activeGroupId}/contacts?page=${page}&limit=${PAGE_SIZE}${
          debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ""
        }`;
  const { data, loading, refetch } = useFetch<ContactsResponse>(contactsUrl);

  // Refresh the rail whenever contacts change (membership counts may change).
  const refreshAll = useCallback(() => {
    refetch();
    refetchGroups();
  }, [refetch, refetchGroups]);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  const confirmDelete = async () => {
    if (!deletingId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/contacts/${deletingId}`, { method: "DELETE" });
      toast.success("Contact deleted");
      setDeletingId(null);
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact");
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!deletingGroup) return;
    setBusy(true);
    try {
      await apiFetch(`/api/groups/${deletingGroup.id}`, { method: "DELETE" });
      toast.success("Group deleted");
      if (activeGroupId === deletingGroup.id) setActiveGroupId(ALL_SENTINEL);
      setDeletingGroup(null);
      refetchGroups();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setBusy(false);
    }
  };

  const totalContactsLabel = total;

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

      {/* Mobile: groups as a select + a separate New-group button. */}
      <div className="md:hidden flex items-center gap-2">
        <Select
          value={activeGroupId}
          onValueChange={(v) => setActiveGroupId(v)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="All contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SENTINEL}>
              All contacts ({groups.reduce((s, g) => s + g.contactCount, 0)})
            </SelectItem>
            {groups.length > 0 && <SelectSeparator />}
            {groups.length > 0 && (
              <SelectGroup>
                <SelectLabel>Groups</SelectLabel>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} ({g.contactCount})
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          aria-label="New group"
          onClick={() => setEditingGroup("new")}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="grid md:grid-cols-[14rem_1fr] gap-4 items-start">
        {/* Groups rail — desktop */}
        <aside className="hidden md:flex flex-col gap-3 bg-card border rounded-2xl p-3 sticky top-4 max-h-[80vh] overflow-y-auto scroll-thin">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Groups
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="New group"
              onClick={() => setEditingGroup("new")}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setActiveGroupId(ALL_SENTINEL)}
            className={`text-sm rounded-lg px-2 py-1.5 text-left flex items-center justify-between gap-2 transition-colors ${
              activeGroupId === ALL_SENTINEL
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="size-3.5" />
              All contacts
            </span>
            <span className="text-xs text-muted-foreground">
              {groups.reduce((s, g) => s + g.contactCount, 0)}
            </span>
          </button>

          {groups.length === 0 ? (
            <div className="text-xs text-muted-foreground rounded-lg border border-dashed p-3 text-center">
              No groups yet.{" "}
              <button
                type="button"
                className="underline font-medium"
                onClick={() => setEditingGroup("new")}
              >
                Create one
              </button>
              .
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {groups.map((g) => (
                <GroupRailRow
                  key={g.id}
                  group={g}
                  active={activeGroupId === g.id}
                  onSelect={() => setActiveGroupId(g.id)}
                  onEdit={() => setEditingGroup(g)}
                  onDelete={() => setDeletingGroup(g)}
                />
              ))}
            </div>
          )}
        </aside>

        {/* Main column */}
        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[12rem] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search email, name, tag…"
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {totalContactsLabel} total
            </div>
          </div>

          {/* Active filter context */}
          {activeGroup && (
            <div className="flex items-center gap-2 text-sm bg-card border rounded-full pl-3 pr-1 py-1 w-fit">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: activeGroup.color }}
                aria-hidden
              />
              <span className="text-muted-foreground">Showing:</span>
              <span className="font-medium text-foreground">
                {activeGroup.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 rounded-full"
                aria-label="Clear group filter"
                onClick={() => setActiveGroupId(ALL_SENTINEL)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}

          {loading && items.length === 0 ? (
            <Skeleton className="h-72 rounded-2xl" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Users}
              title={
                debouncedQ
                  ? "No matching contacts"
                  : activeGroup
                    ? `No contacts in ${activeGroup.name} yet`
                    : "No contacts yet"
              }
              description={
                debouncedQ
                  ? "Try a different search term, or clear the search to see everyone."
                  : activeGroup
                    ? "Add contacts to this group, or link a form so submissions land here automatically."
                    : "Add your first subscriber, or paste in a list of emails to bulk-import."
              }
              actionLabel={
                debouncedQ
                  ? undefined
                  : activeGroup
                    ? "Add contact"
                    : "Import emails"
              }
              onAction={
                debouncedQ
                  ? undefined
                  : activeGroup
                    ? () => setAddOpen(true)
                    : () => setImportOpen(true)
              }
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
                      <TableHead>Telegram</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="pr-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((c) => (
                      <ContactRow
                        key={c.id}
                        contact={c}
                        groups={groups}
                        onDelete={() => setDeletingId(c.id)}
                        onAddedToGroup={refreshAll}
                        activeGroupId={
                          activeGroupId === ALL_SENTINEL ? null : activeGroupId
                        }
                      />
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
        </div>
      </div>

      {/* Add contact dialog */}
      <AddContactDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => refreshAll()}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => refreshAll()}
      />

      {/* Group editor dialog (create / edit) */}
      <GroupEditorDialog
        target={editingGroup}
        onOpenChange={(o) => !o && setEditingGroup(null)}
        onSaved={(g, isNewGroup) => {
          setEditingGroup(null);
          refetchGroups();
          if (isNewGroup) {
            setActiveGroupId(g.id);
          }
        }}
      />

      {/* Delete group confirmation */}
      <AlertDialog
        open={!!deletingGroup}
        onOpenChange={(o) => !o && setDeletingGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingGroup?.name} will be removed. The contacts inside it are
              kept — only the grouping is deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteGroup();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Delete group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete contact confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
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

function GroupRailRow({
  group,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  group: GroupItem;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center justify-between gap-1 rounded-lg pr-1 transition-colors ${
        active ? "bg-primary/10" : "hover:bg-muted"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-left min-w-0 flex-1"
      >
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: group.color }}
          aria-hidden
        />
        <span
          className={`truncate ${
            active ? "text-foreground font-medium" : "text-foreground"
          }`}
          title={group.name}
        >
          {group.name}
        </span>
        {group.formName && (
          <Hash className="size-3 text-muted-foreground shrink-0" aria-hidden />
        )}
        <span className="text-xs text-muted-foreground shrink-0">
          {group.contactCount}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 opacity-60 group-hover:opacity-100"
            aria-label={`Group actions for ${group.name}`}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="size-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ContactRow({
  contact,
  groups,
  onDelete,
  onAddedToGroup,
  activeGroupId,
}: {
  contact: ContactItem;
  groups: GroupItem[];
  onDelete: () => void;
  onAddedToGroup: () => void;
  activeGroupId: string | null;
}) {
  const [busy, setBusy] = useState(false);

  const addToGroup = async (groupId: string) => {
    setBusy(true);
    try {
      await apiFetch<{ added: number }>(`/api/groups/${groupId}/contacts`, {
        method: "POST",
        body: JSON.stringify({ contactIds: [contact.id] }),
      });
      const g = groups.find((x) => x.id === groupId);
      toast.success(`Added to ${g?.name ?? "group"}`);
      onAddedToGroup();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add to group"
      );
    } finally {
      setBusy(false);
    }
  };

  const removeFromGroup = async () => {
    if (!activeGroupId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/groups/${activeGroupId}/contacts?contactId=${contact.id}`, {
        method: "DELETE",
      });
      toast.success("Removed from group");
      onAddedToGroup();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove from group"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="pl-4 font-medium">{contact.email}</TableCell>
      <TableCell className="text-muted-foreground">
        {contact.name || "—"}
      </TableCell>
      <TableCell>
        {contact.tags ? (
          <div className="flex flex-wrap gap-1">
            {contact.tags.split(",").map((t) => (
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
        {contact.telegram ? (
          <span className="font-mono text-xs text-foreground">
            @{contact.telegram}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {contact.active ? (
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
        {fmtDate(contact.createdAt)}
      </TableCell>
      <TableCell className="pr-4 text-right">
        <div className="inline-flex items-center gap-1">
          {activeGroupId ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Remove from group"
              onClick={removeFromGroup}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4 rotate-180" />
              )}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Add to group"
                  disabled={busy || groups.length === 0}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FolderPlus className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Add to group</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {groups.map((g) => (
                  <DropdownMenuItem
                    key={g.id}
                    onSelect={() => addToGroup(g.id)}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: g.color }}
                      aria-hidden
                    />
                    {g.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {g.contactCount}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            aria-label="Delete contact"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
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
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { data: groups } = useFetch<GroupItem[]>("/api/groups");

  const reset = () => {
    setEmail("");
    setName("");
    setTags("");
    setSelectedGroups([]);
  };

  const submit = async () => {
    if (!email.trim()) return toast.error("Email is required");
    setSaving(true);
    try {
      await apiFetch("/api/contacts", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          tags,
          groupIds: selectedGroups,
        }),
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
            <p className="text-xs text-muted-foreground">Comma-separated.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Groups (optional)</Label>
            {groups && groups.length > 0 ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Groups">
                {groups.map((group) => {
                  const selected = selectedGroups.includes(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setSelectedGroups((current) =>
                          selected
                            ? current.filter((id) => id !== group.id)
                            : [...current, group.id]
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                        aria-hidden
                      />
                      {group.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No groups yet — create one in the Groups tab.</p>
            )}
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

function GroupEditorDialog({
  target,
  onOpenChange,
  onSaved,
}: {
  // null = closed, "new" = create, GroupItem = edit existing.
  target: GroupItem | "new" | null;
  onOpenChange: (o: boolean) => void;
  onSaved: (group: GroupItem, isNew: boolean) => void;
}) {
  const open = target !== null;
  const existing = target && target !== "new" ? target : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#1a1a1a");
  const [saving, setSaving] = useState(false);

  // Hydrate whenever the target changes.
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setDescription(existing.description || "");
      setColor(existing.color || "#1a1a1a");
    } else {
      setName("");
      setDescription("");
      setColor("#1a1a1a");
    }
  }, [open, existing]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        color,
      };
      if (existing) {
        const updated = await apiFetch<GroupItem>(
          `/api/groups/${existing.id}`,
          { method: "PATCH", body: JSON.stringify(payload) }
        );
        toast.success("Group updated");
        onSaved(updated, false);
      } else {
        const created = await apiFetch<GroupItem>("/api/groups", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Group created");
        onSaved(created, true);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save group"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit group" : "New group"}
          </DialogTitle>
          <DialogDescription>
            Groups help you segment your list and target campaigns. You can
            link a group to a signup form so submissions land here automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grp-name">Name</Label>
            <Input
              id="grp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Newsletter list"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grp-desc">Description (optional)</Label>
            <Input
              id="grp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="People who opted in via the website footer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grp-color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-9 rounded-md border border-border bg-card cursor-pointer p-0.5"
                aria-label="Group color"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : existing ? (
              <Pencil className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {existing ? "Save changes" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// End of ContactList.
