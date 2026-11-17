"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Code2, FileCode2, Loader2 } from "lucide-react";
import { useFetch } from "../use-api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormPreview } from "./form-preview";
import type { FormFull } from "./types";

interface EmbedDialogProps {
  formId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/** Escape a string for safe inclusion inside an HTML attribute value. */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape for HTML text content. */
function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape a string for safe inclusion inside a JS single-quoted string. */
function escapeJs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function buildHtmlSnippet(form: FormFull, submitUrl: string): string {
  const fields = form.fields.filter(
    (f) => f.name && f.name.trim() && f.label && f.label.trim()
  );
  const accent = form.accentColor;
  const bg = form.backgroundColor;
  const text = form.textColor;

  const inputs = fields
    .map((f) => {
      const inputType = f.type === "email" ? "email" : "text";
      const ph = f.placeholder ? ` placeholder="${escapeAttr(f.placeholder)}"` : "";
      const req = f.required ? " required" : "";
      return `      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:${escapeText(text)};">${escapeText(f.label)}${f.required ? " *" : ""}</label>
      <input type="${inputType}" name="${escapeAttr(f.name)}"${ph}${req} style="width:100%;padding:9px 11px;font-size:14px;border:1px solid ${accent}33;border-radius:8px;box-sizing:border-box;background:${bg};color:${text};margin-bottom:12px;" />`;
    })
    .join("\n");

  return `<!-- MailCast form: ${escapeText(form.name)} -->
<form action="${escapeAttr(submitUrl)}" method="POST" style="background:${bg};color:${text};padding:20px;border-radius:12px;max-width:380px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;border:1px solid rgba(0,0,0,0.08);">
${inputs}
  <button type="submit" style="background:${accent};color:${bg};border:none;padding:10px 16px;font-size:14px;font-weight:600;border-radius:8px;cursor:pointer;width:100%;">
    ${escapeText(form.buttonText)}
  </button>
</form>`;
}

function buildJsSnippet(form: FormFull, submitUrl: string): string {
  const fields = form.fields.filter(
    (f) => f.name && f.name.trim() && f.label && f.label.trim()
  );
  const accent = form.accentColor;
  const bg = form.backgroundColor;
  const text = form.textColor;
  const redirect = form.redirectUrl ? escapeJs(form.redirectUrl) : "";

  const fieldsJs = JSON.stringify(
    fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type === "email" ? "email" : "text",
      required: !!f.required,
      placeholder: f.placeholder || "",
    }))
  );

  return `<!-- MailCast embed: ${escapeText(form.name)} -->
<div id="mc-form-${form.id}"></div>
<script>
(function () {
  var ENDPOINT = ${JSON.stringify(submitUrl)};
  var FIELDS = ${fieldsJs};
  var BUTTON_TEXT = ${JSON.stringify(form.buttonText)};
  var SUCCESS_MESSAGE = ${JSON.stringify(form.successMessage)};
  var REDIRECT_URL = ${JSON.stringify(redirect)};
  var COLORS = { accent: ${JSON.stringify(accent)}, bg: ${JSON.stringify(bg)}, text: ${JSON.stringify(text)} };

  var host = document.getElementById("mc-form-${form.id}");
  if (!host) return;

  var form = document.createElement("form");
  form.style.cssText = "display:flex;flex-direction:column;gap:12px;max-width:380px;padding:20px;border-radius:12px;border:1px solid rgba(0,0,0,0.08);background:" + COLORS.bg + ";color:" + COLORS.text + ";font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;";

  FIELDS.forEach(function (f) {
    var wrap = document.createElement("div");
    var label = document.createElement("label");
    label.textContent = f.label + (f.required ? " *" : "");
    label.style.cssText = "display:block;font-size:13px;font-weight:600;margin-bottom:4px;";
    var input = document.createElement("input");
    input.type = f.type;
    input.name = f.name;
    input.placeholder = f.placeholder || "";
    if (f.required) input.required = true;
    input.style.cssText = "width:100%;padding:9px 11px;font-size:14px;border:1px solid " + COLORS.accent + "33;border-radius:8px;box-sizing:border-box;background:" + COLORS.bg + ";color:" + COLORS.text + ";";
    wrap.appendChild(label);
    wrap.appendChild(input);
    form.appendChild(wrap);
  });

  var btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = BUTTON_TEXT;
  btn.style.cssText = "background:" + COLORS.accent + ";color:" + COLORS.bg + ";border:none;padding:10px 16px;font-size:14px;font-weight:600;border-radius:8px;cursor:pointer;";
  form.appendChild(btn);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = "Submitting…";
    var data = {};
    FIELDS.forEach(function (f) {
      var el = form.elements[f.name];
      if (el) data[f.name] = el.value;
    });
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) {
          if (REDIRECT_URL) {
            window.location.href = REDIRECT_URL;
            return;
          }
          host.innerHTML = "";
          var ok = document.createElement("div");
          ok.textContent = res.message || SUCCESS_MESSAGE;
          ok.style.cssText = "padding:20px;border-radius:12px;background:" + COLORS.bg + ";color:#15803d;font-size:14px;font-weight:500;text-align:center;border:1px solid rgba(0,0,0,0.08);max-width:380px;";
          host.appendChild(ok);
        } else {
          alert((res && res.error) || "Submission failed. Please try again.");
          btn.disabled = false;
          btn.textContent = BUTTON_TEXT;
        }
      })
      .catch(function () {
        alert("Network error. Please try again.");
        btn.disabled = false;
        btn.textContent = BUTTON_TEXT;
      });
  });

  host.appendChild(form);
})();
</script>`;
}

export function EmbedDialog({ formId, open, onOpenChange }: EmbedDialogProps) {
  const url = formId ? `/api/forms/${formId}` : null;
  const { data: form, loading } = useFetch<FormFull>(url);
  const [copied, setCopied] = useState<string | null>(null);

  // Compute the deployed origin client-side so the snippet points back at
  // this app no matter where it is generated from.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const submitUrl = form && origin ? `${origin}/api/forms/${form.id}/submit` : "";

  const htmlSnippet = useMemo(() => {
    if (!form || !submitUrl) return "";
    return buildHtmlSnippet(form, submitUrl);
  }, [form, submitUrl]);

  const jsSnippet = useMemo(() => {
    if (!form || !submitUrl) return "";
    return buildJsSnippet(form, submitUrl);
  }, [form, submitUrl]);

  const copy = async (which: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Could not copy — select and copy manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Code2 className="size-5" /> Embed this form
          </DialogTitle>
          <DialogDescription>
            Paste the snippet into your website&apos;s HTML where you want the
            form to appear.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scroll-thin">
          {loading || !form ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="ml-2 text-sm">Loading form…</span>
            </div>
          ) : (
            <div className="p-6 flex flex-col gap-5">
              {/* Preview */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview
                </span>
                <div className="rounded-xl border bg-muted/30 p-4 flex justify-center">
                  <FormPreview
                    fields={form.fields}
                    buttonText={form.buttonText}
                    accentColor={form.accentColor}
                    backgroundColor={form.backgroundColor}
                    textColor={form.textColor}
                    successMessage={form.successMessage}
                  />
                </div>
              </div>

              {/* Endpoint reference */}
              <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground font-mono break-all">
                POST {submitUrl || "(loading…)"}
              </div>

              <Tabs defaultValue="html" className="gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <TabsList>
                    <TabsTrigger value="html">
                      <FileCode2 className="size-3.5" /> HTML form
                    </TabsTrigger>
                    <TabsTrigger value="js">
                      <Code2 className="size-3.5" /> JavaScript embed
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="html" className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    A plain HTML form. Works without JavaScript — posts directly
                    to the submit endpoint and returns JSON.
                  </p>
                  <CodeBlock
                    code={htmlSnippet}
                    onCopy={() => copy("html", htmlSnippet)}
                    copied={copied === "html"}
                  />
                </TabsContent>

                <TabsContent value="js" className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    A self-contained script that builds the form, submits via
                    fetch, and shows your success message inline (or redirects
                    if you set a redirect URL).
                  </p>
                  <CodeBlock
                    code={jsSnippet}
                    onCopy={() => copy("js", jsSnippet)}
                    copied={copied === "js"}
                  />
                </TabsContent>
              </Tabs>

              <p className="text-xs text-muted-foreground leading-relaxed">
                The endpoint above is your MailCast origin. If you embed on a
                different domain, keep this URL as-is — it points back to your
                MailCast instance.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CodeBlock({
  code,
  onCopy,
  copied,
}: {
  code: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="relative">
      <pre className="bg-muted rounded-lg p-4 overflow-x-auto scroll-thin text-xs leading-relaxed font-mono text-foreground max-h-80 overflow-y-auto">
        <code>{code}</code>
      </pre>
      <Button
        variant="secondary"
        size="sm"
        className="absolute top-2 right-2 rounded-full"
        onClick={onCopy}
        type="button"
      >
        {copied ? (
          <>
            <Check className="size-3.5" /> Copied
          </>
        ) : (
          <>
            <Copy className="size-3.5" /> Copy
          </>
        )}
      </Button>
    </div>
  );
}
