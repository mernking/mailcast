"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, FileText, MailPlus } from "lucide-react";
import { apiFetch } from "../use-api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ImportResponse {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
}

export function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}) {
  const [tab, setTab] = useState("csv");
  const [csv, setCsv] = useState("");
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCsv("");
    setEmails("");
  };

  const submit = async () => {
    setBusy(true);
    try {
      const payload =
        tab === "csv"
          ? { csv }
          : { emails };
      if (tab === "csv" && !csv.trim()) {
        toast.error("Paste some CSV first");
        return;
      }
      if (tab === "emails" && !emails.trim()) {
        toast.error("Paste some emails first");
        return;
      }
      const result = await apiFetch<ImportResponse>("/api/contacts/import", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(
        `Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}`,
        { description: `${result.total} total contacts touched.` }
      );
      reset();
      onOpenChange(false);
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            Bulk add subscribers. Duplicates are merged (updated in place), invalid rows are skipped.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="csv">
              <FileText className="size-3.5" /> Paste CSV
            </TabsTrigger>
            <TabsTrigger value="emails">
              <MailPlus className="size-3.5" /> Paste emails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="mt-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="csv-input">CSV content</Label>
              <Textarea
                id="csv-input"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                placeholder={"name,email,tags\nJane Reader,jane@example.com,founders\nAlex,alex@example.com,weekly-digest"}
                className="min-h-[220px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Header row optional. Detected columns: name, email, tags.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="emails" className="mt-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emails-input">Emails (one per line)</Label>
              <Textarea
                id="emails-input"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder={"jane@example.com\nalex@example.com\nsam@example.com"}
                className="min-h-[220px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Comma, semicolon, or whitespace separated also accepted.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
