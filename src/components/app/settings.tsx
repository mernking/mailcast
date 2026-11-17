"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  ShieldCheck,
  KeyRound,
  Gauge,
  Trash2,
  Loader2,
  ArrowLeft,
  Database,
} from "lucide-react";
import { useFetch, apiFetch } from "./use-api";
import { useAppStore } from "@/hooks/use-app-store";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface Stats {
  totalContacts: number;
  activeContacts: number;
  totalCampaigns: number;
  sentCampaigns: number;
}

export function Settings() {
  const setView = useAppStore((s) => s.setView);
  const setSection = useAppStore((s) => s.setSection);
  const { data: stats } = useFetch<Stats>("/api/stats");
  const [deleteContactsOpen, setDeleteContactsOpen] = useState(false);
  const [deleteCampaignsOpen, setDeleteCampaignsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const doDeleteContacts = async () => {
    setBusy(true);
    try {
      const res = await apiFetch<{ deleted: number }>("/api/contacts/all", {
        method: "DELETE",
      });
      toast.success(`Deleted ${res.deleted} contacts`);
      setDeleteContactsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contacts");
    } finally {
      setBusy(false);
    }
  };

  const doDeleteCampaigns = async () => {
    setBusy(true);
    try {
      const res = await apiFetch<{ deleted: number }>("/api/campaigns/all", {
        method: "DELETE",
      });
      toast.success(`Deleted ${res.deleted} campaigns`);
      setDeleteCampaignsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete campaigns");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <SectionHeading
        title="Settings"
        description="Account info, limits, and data controls."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" /> Your Gmail sender
          </CardTitle>
          <CardDescription>
            Manage the Gmail accounts that broadcast your newsletters.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Senders connected</span>
            <span className="font-medium">
              {stats ? `${stats.totalCampaigns} campaigns tracked` : "Loading…"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded-full"
            onClick={() => setSection("senders")}
          >
            Go to Senders
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-4" /> Gmail sending limits
          </CardTitle>
          <CardDescription>
            Stay under these to keep your account healthy.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-2">
          <div>
            <span className="font-medium text-foreground">Gmail free:</span> about
            500 emails per rolling 24 hours.
          </div>
          <div>
            <span className="font-medium text-foreground">Google Workspace:</span>{" "}
            about 2,000 emails per rolling 24 hours.
          </div>
          <div>
            <span className="font-medium text-foreground">MailCast rate limit:</span>{" "}
            4 emails per second per sender, pooled connections.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" /> Privacy &amp; security
          </CardTitle>
          <CardDescription>How your credentials are handled.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <KeyRound className="size-4 mt-0.5 shrink-0" />
            <span>
              App passwords are encrypted at rest with AES-256-GCM (random 12-byte
              IV per record, authenticated tag).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="size-4 mt-0.5 shrink-0" />
            <span>
              Passwords are never logged and never returned to the client in any
              API response.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="size-4 mt-0.5 shrink-0" />
            <span>
              SMTP connections are pooled and authenticated directly to Gmail from
              the server.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Database className="size-4" /> Danger zone
          </CardTitle>
          <CardDescription>
            These actions permanently delete data and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <div className="font-medium text-foreground">Delete all contacts</div>
              <div className="text-muted-foreground">
                Removes every subscriber and their delivery history.
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setDeleteContactsOpen(true)}
            >
              <Trash2 className="size-4" /> Delete contacts
            </Button>
          </div>
          <div className="border-t pt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <div className="font-medium text-foreground">Delete all campaigns</div>
              <div className="text-muted-foreground">
                Removes every campaign and its recipients.
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setDeleteCampaignsOpen(true)}
            >
              <Trash2 className="size-4" /> Delete campaigns
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="pb-6">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => setView("landing")}
        >
          <ArrowLeft className="size-4" /> Back to site
        </Button>
      </div>

      <AlertDialog open={deleteContactsOpen} onOpenChange={setDeleteContactsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              Every subscriber will be permanently removed. Existing campaigns keep
              their already-sent delivery records but lose the ability to be re-sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doDeleteContacts();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteCampaignsOpen} onOpenChange={setDeleteCampaignsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all campaigns?</AlertDialogTitle>
            <AlertDialogDescription>
              Every campaign and all of its recipients will be permanently removed.
              Senders are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doDeleteCampaigns();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
