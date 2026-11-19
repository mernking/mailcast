"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
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
  | "removeFormat"
  | "undo"
  | "redo";

interface ToolbarAction {
  key: string;
  label: string;
  icon: ReactNode;
  command: CommandType;
  /** Optional argument — for formatBlock it is the tag, for createLink/insertImage it is a prompt. */
  arg?: string;
  /** If true, prompt the user for a URL before running the command. */
  promptUrl?: boolean;
}

// Static descriptor list. Keeping this outside the component avoids rebuilding
// the array every render and keeps ref-touching closures out of the render
// path (which the react-hooks/refs lint rule guards against).
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
  { key: "image", label: "Insert image", icon: <ImageIcon className="size-4" />, command: "insertImage", promptUrl: true },
  { key: "clear", label: "Clear formatting", icon: <RemoveFormatting className="size-4" />, command: "removeFormat" },
  { key: "undo", label: "Undo", icon: <Undo2 className="size-4" />, command: "undo" },
  { key: "redo", label: "Redo", icon: <Redo2 className="size-4" />, command: "redo" },
];

/**
 * Lightweight WYSIWYG editor built on a contentEditable div + the (deprecated
 * but universally supported) document.execCommand API. Good enough for
 * authoring newsletter body HTML without pulling a 200kb dependency.
 *
 * The editable element's innerHTML is initialized from `value` only when the
 * incoming value differs from the element's current innerHTML — this prevents
 * cursor jumps while the user is typing (since onChange feeds the same string
 * back up and re-renders the parent).
 */
export function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const elRef = useRef<HTMLDivElement | null>(null);

  // Initialize / sync innerHTML only when the incoming value differs from
  // the live DOM. This is what avoids clobbering the caret on every keystroke.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (value !== el.innerHTML) {
      el.innerHTML = value;
    }
  }, [value]);

  // Run a formatting command against the editable element. Memoized so the
  // toolbar buttons can safely reference it without re-creating closures in
  // the render path.
  const exec = useCallback(
    (action: ToolbarAction) => {
      if (disabled) return;
      const el = elRef.current;
      if (!el) return;
      el.focus();

      let arg = action.arg;
      if (action.promptUrl) {
        const url =
          typeof window !== "undefined" ? window.prompt(action.label === "Insert image" ? "Image URL" : "Link URL", "") : null;
        if (!url || !url.trim()) return;
        arg = url.trim();
      }

      try {
        // execCommand is deprecated but still works in all current browsers and
        // is the simplest way to handle contentEditable formatting without a
        // full framework. Guard in try/catch for safety.
        document.execCommand(action.command, false, arg);
      } catch {
        /* no-op */
      }
      // Sync the new HTML up to the parent after every formatting action.
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
    // Catch any trailing DOM mutation that didn't fire an input event.
    if (el.innerHTML !== value) onChange(el.innerHTML);
  }, [value, onChange]);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
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
