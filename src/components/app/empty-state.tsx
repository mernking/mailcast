"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-card border rounded-2xl p-10 flex flex-col items-center text-center gap-3">
      {Icon && (
        <div className="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <Icon className="size-5" />
        </div>
      )}
      <div>
        <h3 className="font-serif text-xl text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2 rounded-full">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
