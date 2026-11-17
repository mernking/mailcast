"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** Trend / accent color hint. Defaults to neutral. */
  tone?: "neutral" | "success" | "warning" | "danger";
}

const TONE_STYLES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-chart-1/10 text-chart-1",
  warning: "bg-chart-4/20 text-chart-5",
  danger: "bg-destructive/10 text-destructive",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: StatCardProps) {
  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg",
              TONE_STYLES[tone]
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div>
        <div className="font-serif text-3xl leading-none text-foreground">
          {value}
        </div>
        {hint && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
      </div>
    </div>
  );
}
