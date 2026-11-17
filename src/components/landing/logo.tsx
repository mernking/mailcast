import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MailCast wordmark — a paper-plane mark in an ink pill plus the
 * Instrument Serif wordmark. Renders black-on-cream by default.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Send className="size-4" strokeWidth={2.25} />
      </span>
      <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
        MailCast
      </span>
    </span>
  );
}
