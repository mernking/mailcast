"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, FileText, MailPlus, FileUp } from "lucide-react";
import { apiFetch } from "../use-api";
import {
  defaultColumnMapping,
  mapCsvRows,
  parseCsv,
  type ColumnMapping,
} from "@/lib/contact-import";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

const MAPPING_OPTIONS: { value: ColumnMapping; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "name", label: "Name" },
  { value: "tags", label: "Tags" },
  { value: "telegram", label: "Telegram" },
  { value: "group", label: "Group" },
  { value: "skip", label: "Skip column" },
];

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
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, ColumnMapping>>({});
  const [defaultGroups, setDefaultGroups] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCsv("");
    setEmails("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setDefaultGroups("");
  };

  const loadCsv = (text: string) => {
    setCsv(text);
    const parsed = parseCsv(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(defaultColumnMapping(parsed.headers));
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      loadCsv(await file.text());
      setTab("csv");
    } catch {
      toast.error("Could not read that file");
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (tab === "emails" && !emails.trim()) {
        toast.error("Paste some emails first");
        return;
      }
      if (tab === "csv" && !csv.trim()) {
        toast.error("Upload or paste some CSV first");
        return;
      }

      let payload: Record<string, unknown>;
      if (tab === "emails") {
        payload = { emails };
      } else if (headers.length > 0) {
        const groups = defaultGroups
          .split(/[,;]/)
          .map((g) => g.trim())
          .filter(Boolean);
        const mapped = mapCsvRows(headers, rows, mapping, groups);
        if (mapped.contacts.length === 0) {
          toast.error("No valid rows — check your column mapping");
          return;
        }
        payload = { contacts: mapped.contacts };
      } else {
        payload = { csv };
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
            Upload a CSV and map each column to a contact field. Duplicates are
            merged (updated in place); invalid rows are skipped.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upload">
              <FileUp className="size-3.5" /> Upload CSV
            </TabsTrigger>
            <TabsTrigger value="csv">
              <FileText className="size-3.5" /> Paste CSV
            </TabsTrigger>
            <TabsTrigger value="emails">
              <MailPlus className="size-3.5" /> Paste emails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="csv-file">CSV file</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => loadFile(e.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                The first row is treated as column headings. You will map them
                on the Paste CSV tab.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="mt-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="csv-input">CSV content</Label>
                <Textarea
                  id="csv-input"
                  value={csv}
                  onChange={(e) => loadCsv(e.target.value)}
                  placeholder={"name,email,tags\nJane Reader,jane@example.com,founders"}
                  className="min-h-[140px] font-mono text-xs"
                />
              </div>

              {headers.length > 0 && (
                <div className="rounded-lg border p-3 flex flex-col gap-3">
                  <p className="text-sm font-medium">Map columns</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {headers.map((header, index) => (
                      <div key={`${header}-${index}`} className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          {header}
                          {rows[0]?.[index] ? ` — e.g. ${rows[0][index]}` : ""}
                        </Label>
                        <select
                          value={mapping[header] ?? "skip"}
                          onChange={(e) =>
                            setMapping((current) => ({
                              ...current,
                              [header]: e.target.value as ColumnMapping,
                            }))
                          }
                          className="h-9 rounded-md border bg-background px-2 text-sm"
                        >
                          {MAPPING_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="default-groups" className="text-xs text-muted-foreground">
                      Add every row to these groups (optional)
                    </Label>
                    <Input
                      id="default-groups"
                      value={defaultGroups}
                      onChange={(e) => setDefaultGroups(e.target.value)}
                      placeholder="Newsletter, Beta readers"
                    />
                  </div>
                  {rows.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="text-muted-foreground text-left">
                            {headers.map((header, index) => (
                              <th key={`${header}-${index}`} className="py-1 pr-3 font-medium">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {headers.map((_, index) => (
                                <td key={index} className="py-1 pr-3">
                                  {row[index] ?? ""}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Previewing {Math.min(5, rows.length)} of {rows.length} rows.
                      </p>
                    </div>
                  )}
                </div>
              )}
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
