"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Plus, KeyRound, ShieldCheck } from "lucide-react";
import { apiFetch } from "../use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddSenderDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

interface CreatedSender {
  id: string;
  email: string;
  fromName: string;
  verified: boolean;
  createdAt: string;
  warning?: string;
}

export function AddSenderDialog({ open, onOpenChange, onSaved }: AddSenderDialogProps) {
  const [email, setEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEmail("");
    setFromName("");
    setPassword("");
    setShowPassword(false);
  };

  const submit = async () => {
    if (!email.trim()) return toast.error("Email is required");
    if (!fromName.trim()) return toast.error("From name is required");
    if (!password.trim()) return toast.error("App password is required");

    setSaving(true);
    try {
      const created = await apiFetch<CreatedSender>("/api/senders", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          fromName: fromName.trim(),
          password: password.trim(),
        }),
      });
      if (created.warning) {
        toast.warning("Sender saved", { description: created.warning });
      } else {
        toast.success("Sender added and verified", {
          description: `${created.fromName} <${created.email}>`,
        });
      }
      reset();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add sender");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Gmail sender</DialogTitle>
          <DialogDescription>
            Use a Gmail account with an app password. We verify the connection before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sender-email">Gmail address</Label>
            <Input
              id="sender-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sender-name">From name</Label>
            <Input
              id="sender-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="The Weekly Dispatch"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sender-password">App password</Label>
            <div className="relative">
              <Input
                id="sender-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              16 characters, no spaces required.
            </p>
          </div>

          <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <KeyRound className="size-3.5" /> How to get an app password
            </div>
            <ol className="list-decimal pl-4 flex flex-col gap-1">
              <li>
                Open{" "}
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium"
                >
                  myaccount.google.com
                </a>{" "}
                → Security.
              </li>
              <li>Enable 2-Step Verification if not already on.</li>
              <li>Open "App passwords" and pick "Other" → name it MailCast.</li>
              <li>Copy the 16-character password and paste it above.</li>
            </ol>
            <div className="flex items-center gap-1.5 pt-1 text-foreground">
              <ShieldCheck className="size-3.5" /> Encrypted at rest with AES-256-GCM. Never logged, never returned to the client.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add sender
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
