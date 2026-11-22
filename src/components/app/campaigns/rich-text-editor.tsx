"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ChangeEvent, ClipboardEvent, DragEvent, ReactNode } from "react";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

type CommandType =
  | "bold"
  | "italic"
  | "underline"
  | "formatBlock"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "createLink"
  | "insertImage"
  | "insertHTML"
  | "removeFormat"
  | "undo"
  | "redo";

interface ToolbarAction {
  key: string;
  label: string;
  icon: ReactNode;
  command: CommandType;
  arg?: string;
  /** If true, prompt the user for a URL before running the command. */
  promptUrl?: boolean;
  /** If true, open a file picker and upload the chosen image first. */
  uploadImage?: boolean;
}

/** Upload an image and return the relative URL it will be served from. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/files", { method: "POST", body: form });
  const data = (await res.json()) as { id?: string; url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Image upload failed");
  }
  return data.url;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { key: "bold", label: "Bold", icon: <Bold className="size-4" />, command: "bold" },
  { key: "italic", label: "Italic", icon: <Italic className="size-4" />, command: "italic" },
  { key: "underline", label: "Underline", icon: <Underline className="size-4" />, command: "underline" },
  { key: "h1", label: "Heading 1", icon: <Heading1 className="size-4" />, command: "formatBlock", arg: "<h1>" },
  { key: "h2", label: "Heading 2", icon: <Heading2 className="size-4" />, command: "formatBlock", arg: "<h2>" },
  { key: "p", label: "Paragraph", icon: <span className="text-[11px] font-semibold leading-none">P</span>, command: "formatBlock", arg: "<p>" },
  { key: "ul", label: "Bulleted list", icon: <List className="size-4" />, command: "insertUnorderedList" },
  { key: "ol", label: "Numbered list", icon: <ListOrdered className="size-4" />, command: "insertOrderedList" },
  { key: "link", label: "Insert link", icon: <LinkIcon className="size-4" />, command: "createLink", promptUrl: true },
  { key: "image", label: "Insert image", icon: <ImageIcon className="size-4" />, command: "insertImage", uploadImage: true },
  { key: "clear", label: "Clear formatting", icon: <RemoveFormatting className="size-4" />, command: "removeFormat" },
  { key: "undo", label: "Undo", icon: <Undo2 className="size-4" />, command: "undo" },
  { key: "redo", label: "Redo", icon: <Redo2 className="size-4" />, command: "redo" },
];

/**
 * Lightweight WYSIWYG editor on a contentEditable div + document.execCommand.
 * The editable element's innerHTML is initialized from `value` only when the
 * incoming value differs from the live DOM, preventing caret jumps.
 */
export function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (value !== el.innerHTML) {
      el.innerHTML = value;
    }
  }, [value]);

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    savedRange.current =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;
  }, []);

  const insertHtml = useCallback(
    (html: string) => {
      const el = elRef.current;
      if (!el) return;
      el.focus();
      const selection = window.getSelection();
      if (savedRange.current && selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange.current);
      }
      try {
        document.execCommand("insertHTML", false, html);
      } catch {
        /* no-op */
      }
      onChange(el.innerHTML);
      savedRange.current = null;
    },
    [onChange]
  );

  const insertImages = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (images.length === 0) return;
      rememberSelection();
      try {
        const urls = await Promise.all(images.map(uploadImage));
        insertHtml(
          urls
            .map(
              (url, index) =>
                `<img src="${url}" alt="${images[index]?.name.replace(/["<>]/g, "") ?? "image"}">`
            )
            .join("")
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Image upload failed");
      }
    },
    [insertHtml, rememberSelection]
  );

  const exec = useCallback(
    (action: ToolbarAction) => {
      if (disabled) return;
      if (action.uploadImage) {
        fileRef.current?.click();
        return;
      }
      const el = elRef.current;
      if (!el) return;
      el.focus();

      let arg = action.arg;
      if (action.promptUrl) {
        const url =
          typeof window !== "undefined"
            ? window.prompt(action.label === "Insert image" ? "Image URL" : "Link URL", "")
            : null;
        if (!url || !url.trim()) return;
        arg = url.trim();
      }

      try {
        document.execCommand(action.command, false, arg);
      } catch {
        /* no-op */
      }
      onChange(el.innerHTML);
    },
    [disabled, onChange]
  );

  const handleInput = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    if (el.innerHTML !== value) onChange(el.innerHTML);
  }, [value, onChange]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      void insertImages(files);
      event.target.value = "";
    },
    [insertImages]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(event.clipboardData.files);
      if (files.some((file) => file.type.startsWith("image/"))) {
        event.preventDefault();
        void insertImages(files);
      }
    },
    [insertImages]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const files = Array.from(event.dataTransfer.files);
      if (files.some((file) => file.type.startsWith("image/"))) {
        event.preventDefault();
        void insertImages(files);
      }
    },
    [insertImages]
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <div
        className="bg-muted/50 border-b rounded-t-lg px-2 py-1 flex flex-wrap gap-1 sticky top-0 z-10"
        role="toolbar"
        aria-label="Formatting"
      >
        {TOOLBAR_ACTIONS.map((a) => (
          <Button
            key={a.key}
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => exec(a)}
            disabled={disabled}
            title={a.label}
            aria-label={a.label}
          >
            {a.icon}
          </Button>
        ))}
      </div>
      <div
        ref={elRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        spellCheck
        onInput={handleInput}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onDrop={handleDrop}
        className={cn(
          "min-h-[320px] prose-sm outline-none px-3 py-2 rounded-b-lg focus:ring-1 focus:ring-ring",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:font-serif",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:font-serif",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
          "[&_li]:my-0.5",
          "[&_a]:underline [&_a]:text-foreground [&_a]:font-medium",
          "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2",
          "[&_p]:my-2",
          "[&_strong]:font-semibold",
          "text-[15px] leading-relaxed text-foreground"
        )}
      />
    </div>
  );
}
