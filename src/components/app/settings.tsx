"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  Info,
  Unplug,
} from "lucide-react";
import { useFetch, apiFetch } from "./use-api";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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

interface TelegramStatus {
  configured: boolean;
  botUsername?: string;
  botFirstName?: string;
  error?: string;
}

interface TelegramStats {
  contactsWithTelegram: number;
  contactsConnected: number;
}

/** Telegram bot card. Renders the connect form when no token is stored, or
 *  the connected summary (bot username + reach stats) when one is. */
function TelegramCard() {
  const { data: status, loading, refetch: refetchStatus } = useFetch<TelegramStatus>(
    "/api/settings/telegram"
  );
  // Only fetch stats when a bot is configured.
  const { data: tgStats, refetch: refetchStats } = useFetch<TelegramStats | null>(
    status?.configured ? "/api/settings/telegram/stats" : null
  );

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const refreshAll = () => {
    refetchStatus();
    refetchStats();
  };

  const connect = async () => {
    if (!token.trim()) {
      toast.error("Paste a bot token first");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ ok: boolean; botUsername?: string }>(
        "/api/settings/telegram",
        { method: "PUT", body: JSON.stringify({ token: token.trim() }) }
      );
      toast.success(
        res.botUsername
          ? `Bot @${res.botUsername} connected`
          : "Telegram bot connected"
      );
      setToken("");
      setShowToken(false);
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect bot");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/settings/telegram", { method: "DELETE" });
      toast.success("Telegram bot disconnected");
      setDisconnectOpen(false);
      setToken("");
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setSaving(false);
    }
  };

  const configured = !!status?.configured;
  const invalid = configured && !!status?.error;
  const botUsername = status?.botUsername;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4" /> Telegram bot
        </CardTitle>
        <CardDescription>
          Deliver newsletters to subscribers who connect a Telegram account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking Telegram configuration…
          </div>
        ) : configured ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                {invalid ? (
                  <Badge
                    variant="outline"
                    className="border-destructive/40 text-destructive"
                  >
                    <Unplug className="size-3" /> Token invalid
                  </Badge>
                ) : (
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                    <CheckCircle2 className="size-3" /> Connected
                  </Badge>
                )}
                {botUsername ? (
                  <span className="text-foreground">
                    Connected as{" "}
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      @{botUsername}
                    </a>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Token stored but username unavailable
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setDisconnectOpen(true)}
                disabled={saving}
              >
                <Trash2 className="size-4" /> Disconnect
              </Button>
            </div>

            {invalid && (
              <Alert variant="destructive">
                <Info className="size-4" />
                <AlertTitle>Telegram rejected this token</AlertTitle>
                <AlertDescription>
                  {status?.error} — reconnect with a fresh token from @BotFather
                  to resume delivery.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-2xl font-serif text-foreground">
                  {tgStats?.contactsWithTelegram ?? "—"}
                </div>
                <div className="text-muted-foreground leading-snug">
                  contacts shared a Telegram username
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-2xl font-serif text-foreground">
                  {tgStats?.contactsConnected ?? "—"}
                </div>
                <div className="text-muted-foreground leading-snug">
                  have started the bot
                </div>
              </div>
            </div>

            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Subscribers must start a conversation with{" "}
                {botUsername ? (
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    @{botUsername}
                  </a>
                ) : (
                  "your bot"
                )}{" "}
                (send <span className="font-medium text-foreground">/start</span>) before they
                can receive messages. New subscribers who submit a Telegram username via a
                signup form are matched automatically once they message the bot.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="telegram-token">Bot token</Label>
              <div className="relative">
                <Input
                  id="telegram-token"
                  type={showToken ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9"
                  onClick={() => setShowToken((s) => !s)}
                  aria-label={showToken ? "Hide token" : "Show token"}
                  tabIndex={-1}
                >
                  {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get one from @BotFather via <span className="font-mono">/newbot</span>.
              </p>
            </div>

            <Button
              className="w-fit rounded-full"
              onClick={connect}
              disabled={saving || !token.trim()}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Connect bot
            </Button>

            <Alert>
              <Info className="size-4" />
              <AlertTitle>How Telegram delivery works</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    Create a bot with{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      @BotFather
                    </a>{" "}
                    on Telegram: send{" "}
                    <span className="font-mono text-foreground">/newbot</span>, then copy the
                    API token.
                  </li>
                  <li>Paste the token here and click Connect.</li>
                  <li>
                    Add a Telegram field to your signup forms to collect usernames.
                  </li>
                  <li>
                    Subscribers must send{" "}
                    <span className="font-mono text-foreground">/start</span> to your bot
                    once — then they can receive newsletters in their Telegram inbox.
                  </li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                When no bot is configured, Telegram send actions in automations are skipped
                silently (no errors).
              </span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline shrink-0"
              >
                Open @BotFather <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Telegram bot?</AlertDialogTitle>
            <AlertDialogDescription>
              The bot token is removed from MailCast. Subscribers who already started the bot
              keep their chat ids, but no new messages will be sent until you reconnect. New
              signup submissions will not be matched until a new bot is configured.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                disconnect();
              }}
              disabled={saving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function Settings() {
  const router = useRouter();
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

      <TelegramCard />

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
            onClick={() => router.push("/dashboard/senders")}
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
          onClick={() => router.push("/")}
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
