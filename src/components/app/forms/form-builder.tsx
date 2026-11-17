"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Save,
  Code2,
  Eye,
  Users,
  Link as LinkIcon,
} from "lucide-react";
import { apiFetch, useFetch } from "../use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormPreview } from "./form-preview";
import {
  type FieldType,
  type FormField,
  type FormFull,
  type LinkedGroup,
  FIELD_TYPE_LABELS,
  NEW_FORM_DEFAULTS,
  suggestName,
} from "./types";

interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  formId?: string | null;
  formName?: string | null;
  contactCount: number;
  createdAt: string;
}

interface FormBuilderProps {
  /** "new" for create, a real id to edit, or null when closed. */
  formId: string | null;
  onClose: () => void;
  /**
   * Called after a successful save. Receives the saved form id and whether
   * the user asked to open the embed dialog next.
   */
  onSaved: (savedId: string, openEmbed: boolean) => void;
}

/** Sentinel sent to the API to mean "clear the current link". */
const LINK_NONE = "__none__";
/** Sentinel used in the Select UI for "auto-create a new group". */
const LINK_CREATE = "__create__";

function emptyField(): FormField {
  return {
    name: "",
    label: "",
    type: "text",
    required: false,
    placeholder: "",
  };
}

export function FormBuilder({ formId, onClose, onSaved }: FormBuilderProps) {
  const open = formId !== null;
  const isNew = formId === "new";

  // Only fetch when there is a concrete id (not "new" and not null).
  const fetchUrl =
    open && !isNew && formId ? `/api/forms/${formId}` : null;
  const { data: loaded, loading } = useFetch<FormFull>(fetchUrl);
  const { data: groupsData, refetch: refetchGroups } =
    useFetch<GroupSummary[]>("/api/groups");
  const groups = groupsData || [];

  const [name, setName] = useState("");
  const [fields, setFields] = useState<FormField[]>(NEW_FORM_DEFAULTS.fields);
  const [buttonText, setButtonText] = useState(NEW_FORM_DEFAULTS.buttonText);
  const [successMessage, setSuccessMessage] = useState(
    NEW_FORM_DEFAULTS.successMessage
  );
  const [redirectUrl, setRedirectUrl] = useState("");
  const [tagsToAdd, setTagsToAdd] = useState("");
  const [accentColor, setAccentColor] = useState(NEW_FORM_DEFAULTS.accentColor);
  const [backgroundColor, setBackgroundColor] = useState(
    NEW_FORM_DEFAULTS.backgroundColor
  );
  const [textColor, setTextColor] = useState(NEW_FORM_DEFAULTS.textColor);

  // Group-link state. `linkMode` drives the Select; `linkedGroup` is what
  // the server last told us is linked (used for the read-only display).
  const [linkMode, setLinkMode] = useState<string>("none");
  const [linkedGroup, setLinkedGroup] = useState<LinkedGroup | null>(null);

  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from loaded form when editing an existing one. For "new", we
  // reset to defaults once on open.
  useEffect(() => {
    if (!open) {
      setHydrated(false);
      return;
    }
    if (isNew) {
      setName("");
      setFields(NEW_FORM_DEFAULTS.fields);
      setButtonText(NEW_FORM_DEFAULTS.buttonText);
      setSuccessMessage(NEW_FORM_DEFAULTS.successMessage);
      setRedirectUrl("");
      setTagsToAdd("");
      setAccentColor(NEW_FORM_DEFAULTS.accentColor);
      setBackgroundColor(NEW_FORM_DEFAULTS.backgroundColor);
      setTextColor(NEW_FORM_DEFAULTS.textColor);
      setLinkedGroup(null);
      setLinkMode("none");
      setHydrated(true);
      return;
    }
    if (loaded) {
      setName(loaded.name);
      setFields(
        loaded.fields && loaded.fields.length > 0
          ? loaded.fields
          : NEW_FORM_DEFAULTS.fields
      );
      setButtonText(loaded.buttonText);
      setSuccessMessage(loaded.successMessage);
      setRedirectUrl(loaded.redirectUrl || "");
      setTagsToAdd(loaded.tagsToAdd);
      setAccentColor(loaded.accentColor);
      setBackgroundColor(loaded.backgroundColor);
      setTextColor(loaded.textColor);
      setLinkedGroup(loaded.linkedGroup ?? null);
      setLinkMode(loaded.linkedGroup ? loaded.linkedGroup.id : "none");
      setHydrated(true);
    }
  }, [open, isNew, loaded]);

  const hasEmailField = useMemo(
    () => fields.some((f) => f.name.toLowerCase() === "email"),
    [fields]
  );

  const updateField = (idx: number, patch: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    );
  };

  const updateLabel = (idx: number, label: string) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        // Auto-suggest the name field from the label only when the current
        // name is empty or was previously auto-derived from the prior label.
        const shouldAuto =
          !f.name || f.name === suggestName(f.label) || f.name === "field";
        return {
          ...f,
          label,
          name: shouldAuto ? suggestName(label) : f.name,
        };
      })
    );
  };

  const addField = () => {
    setFields((prev) => [...prev, emptyField()]);
  };

  const removeField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: name.trim(),
      fields,
      buttonText: buttonText.trim(),
      successMessage: successMessage.trim(),
      redirectUrl: redirectUrl.trim() || null,
      tagsToAdd,
      accentColor,
      backgroundColor,
      textColor,
    };

    // Translate the Select's link mode into API instructions.
    if (linkMode === LINK_NONE) {
      // Only send the clear instruction if there is currently a link to
      // clear (avoids no-op PATCH errors when nothing else changed).
      if (linkedGroup) payload.linkGroupId = LINK_NONE;
    } else if (linkMode === LINK_CREATE) {
      payload.createGroupForForm = true;
    } else if (linkMode && linkMode !== "none") {
      // Existing group id — only send if it differs from what's linked.
      if (!linkedGroup || linkedGroup.id !== linkMode) {
        payload.linkGroupId = linkMode;
      }
    }
    return payload;
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Give your form a name.";
    if (!hasEmailField)
      return "Add an email field — every submission needs an email address.";
    if (!buttonText.trim()) return "Button text cannot be empty.";
    // Check duplicate field names.
    const names = fields
      .map((f) => f.name)
      .filter((n) => n.trim() !== "");
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) return `Duplicate field name: "${dupes[0]}".`;
    return null;
  };

  const save = async (openEmbed: boolean) => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      let saved: FormFull;
      if (isNew) {
        saved = await apiFetch<FormFull>("/api/forms", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Form created");
      } else if (formId) {
        saved = await apiFetch<FormFull>(`/api/forms/${formId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Form saved");
      } else {
        throw new Error("No form to save");
      }
      // Reflect the freshly-resolved link locally.
      setLinkedGroup(saved.linkedGroup ?? null);
      setLinkMode(saved.linkedGroup ? saved.linkedGroup.id : "none");
      refetchGroups();
      onSaved(saved.id, openEmbed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="font-serif text-xl">
            {isNew ? "New form" : "Edit form"}
          </DialogTitle>
          <DialogDescription>
            Design your signup form. The preview on the right shows exactly
            what gets embedded on your site.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scroll-thin">
          {open && !isNew && loading && !hydrated ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="ml-2 text-sm">Loading form…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0">
              {/* Editor column */}
              <div className="p-6 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r">
                {/* Form identity */}
                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Details
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fb-name">Form name</Label>
                    <Input
                      id="fb-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Newsletter signup"
                    />
                    <p className="text-xs text-muted-foreground">
                      Internal label — only you see this.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="fb-button">Button text</Label>
                      <Input
                        id="fb-button"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="Subscribe"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="fb-tags">Tags to add</Label>
                      <Input
                        id="fb-tags"
                        value={tagsToAdd}
                        onChange={(e) => setTagsToAdd(e.target.value)}
                        placeholder="newsletter, waitlist"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fb-success">Success message</Label>
                    <Input
                      id="fb-success"
                      value={successMessage}
                      onChange={(e) => setSuccessMessage(e.target.value)}
                      placeholder="Thanks for subscribing!"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fb-redirect">Redirect URL (optional)</Label>
                    <Input
                      id="fb-redirect"
                      value={redirectUrl}
                      onChange={(e) => setRedirectUrl(e.target.value)}
                      placeholder="https://yoursite.com/welcome"
                    />
                    <p className="text-xs text-muted-foreground">
                      If set, the JS embed redirects here on success instead of
                      showing the message.
                    </p>
                  </div>
                </section>

                <Separator />

                {/* Fields editor */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Fields
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={addField}
                      type="button"
                    >
                      <Plus className="size-3.5" /> Add field
                    </Button>
                  </div>

                  {!hasEmailField && (
                    <div className="rounded-lg border border-chart-1/40 bg-chart-1/10 px-3 py-2 text-xs text-chart-1">
                      Every form needs an email field — submissions are stored
                      against the contact&apos;s email.
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {fields.map((f, idx) => (
                      <FieldRow
                        key={idx}
                        field={f}
                        index={idx}
                        total={fields.length}
                        onChange={(patch) => updateField(idx, patch)}
                        onLabelChange={(label) => updateLabel(idx, label)}
                        onRemove={() => removeField(idx)}
                        onMove={(dir) => moveField(idx, dir)}
                      />
                    ))}
                    {fields.length === 0 && (
                      <div className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                        No fields yet. Add an email field to start.
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Recipient group */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Recipient group
                    </h3>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fb-group">Link a contact group</Label>
                    <Select
                      value={linkMode}
                      onValueChange={(v) => setLinkMode(v)}
                    >
                      <SelectTrigger id="fb-group" className="w-full">
                        <SelectValue placeholder="No group linked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LINK_NONE}>
                          No group (submissions only add to your list)
                        </SelectItem>
                        <SelectItem value={LINK_CREATE}>
                          Create a new group for this form
                        </SelectItem>
                        {groups.length > 0 && (
                          <>
                            <SelectItem value="divider-existing" disabled>
                              — Existing groups —
                            </SelectItem>
                            {groups.map((g) => (
                              <SelectItem
                                key={g.id}
                                value={g.id}
                                disabled={!!g.formId && g.formId !== formId}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: g.color }}
                                    aria-hidden
                                  />
                                  {g.name}
                                  {g.contactCount > 0 && (
                                    <span className="text-muted-foreground">
                                      ({g.contactCount})
                                    </span>
                                  )}
                                  {!!g.formId && g.formId !== formId && (
                                    <span className="text-muted-foreground">
                                      · linked to {g.formName || "another form"}
                                    </span>
                                  )}
                                </span>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {linkedGroup && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <LinkIcon className="size-3" />
                        Currently linked to{" "}
                        <span className="font-medium text-foreground">
                          {linkedGroup.name}
                        </span>
                        . Submissions will be added there automatically.
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Submissions to this form are automatically added to the
                      linked group. Pick an existing group, create one for this
                      form, or leave it unlinked.
                    </p>
                  </div>
                </section>

                <Separator />

                {/* Colors */}
                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Colors
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ColorInput
                      label="Accent"
                      value={accentColor}
                      onChange={setAccentColor}
                    />
                    <ColorInput
                      label="Background"
                      value={backgroundColor}
                      onChange={setBackgroundColor}
                    />
                    <ColorInput
                      label="Text"
                      value={textColor}
                      onChange={setTextColor}
                    />
                  </div>
                </section>
              </div>

              {/* Preview column */}
              <div className="bg-muted/40 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Eye className="size-3.5" /> Live preview
                </div>
                <FormPreview
                  fields={fields}
                  buttonText={buttonText}
                  accentColor={accentColor}
                  backgroundColor={backgroundColor}
                  textColor={textColor}
                  successMessage={successMessage}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This is what visitors will see on your site. Colors and fields
                  update as you edit.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-card">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-full"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save
          </Button>
          <Button
            onClick={() => save(true)}
            disabled={saving}
            variant="secondary"
            className="rounded-full"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Code2 className="size-4" />
            )}
            Save &amp; get embed code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  field,
  index,
  total,
  onChange,
  onLabelChange,
  onRemove,
  onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  onChange: (patch: Partial<FormField>) => void;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 flex flex-col gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_130px_auto] gap-2 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] text-muted-foreground">Label</Label>
          <Input
            value={field.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Email"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] text-muted-foreground">Field key</Label>
          <Input
            value={field.name}
            onChange={(e) =>
              onChange({
                name: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]+/g, "_")
                  .replace(/^_+|_+$/g, ""),
              })
            }
            placeholder="email"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] text-muted-foreground">Type</Label>
          <Select
            value={field.type}
            onValueChange={(v) => onChange({ type: v as FieldType })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            type="button"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            type="button"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            aria-label="Remove field"
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
        <Input
          value={field.placeholder || ""}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder="Placeholder (optional)"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => onChange({ required: checked })}
          />
          Required
        </label>
      </div>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 rounded-md border border-border bg-card cursor-pointer p-0.5"
          aria-label={`${label} color`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}
