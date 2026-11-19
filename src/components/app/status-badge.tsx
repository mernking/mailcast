"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type CampaignStatus = "draft" | "sending" | "sent" | "failed";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sending: "bg-chart-4/20 text-chart-5",
  sent: "bg-chart-1/10 text-chart-1",
  failed: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = (STATUS_STYLES as Record<string, string>)[status] || STATUS_STYLES.draft;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent capitalize", tone)}
    >
      {label}
    </Badge>
  );
}

type RecipientStatus = "pending" | "sent" | "failed";

const RECIPIENT_STYLES: Record<RecipientStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  sent: "bg-chart-1/10 text-chart-1",
  failed: "bg-destructive/10 text-destructive",
};

export function RecipientStatusBadge({ status }: { status: string }) {
  const tone =
    (RECIPIENT_STYLES as Record<string, string>)[status] ||
    RECIPIENT_STYLES.pending;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent capitalize", tone)}
    >
      {label}
    </Badge>
  );
}
