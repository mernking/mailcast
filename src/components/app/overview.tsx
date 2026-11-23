"use client";

import { useRouter } from "next/navigation";
import { Send, Users, MailCheck, Activity, ArrowRight } from "lucide-react";
import { useFetch } from "./use-api";
import { StatCard } from "./stat-card";
import { SectionHeading } from "./section-heading";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate } from "./use-api";

interface StatsResponse {
  totalContacts: number;
  activeContacts: number;
  totalCampaigns: number;
  sentCampaigns: number;
  totalEmailsSent: number;
  deliveryRate: number;
  recentCampaigns: Array<{
    id: string;
    title: string;
    subject: string;
    status: string;
    totalRecip: number;
    sentCount: number;
    failedCount: number;
    createdAt: string;
    sentAt: string | null;
    sender: { email: string; fromName: string } | null;
  }>;
}

export function Overview() {
  const { data, loading } = useFetch<StatsResponse>("/api/stats");
  const router = useRouter();

  const stats = data;

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
      <SectionHeading
        title="Overview"
        description="A snapshot of your audience, broadcasts, and delivery health."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !stats
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : (
            <>
              <StatCard
                label="Total contacts"
                value={stats?.totalContacts ?? 0}
                hint={`${stats?.activeContacts ?? 0} active`}
                icon={Users}
              />
              <StatCard
                label="Campaigns sent"
                value={stats?.sentCampaigns ?? 0}
                hint={`${stats?.totalCampaigns ?? 0} total drafts + sent`}
                icon={Send}
                tone="success"
              />
              <StatCard
                label="Emails sent"
                value={stats?.totalEmailsSent ?? 0}
                hint={`${stats?.deliveryRate ?? 0}% delivery rate`}
                icon={MailCheck}
                tone="success"
              />
              <StatCard
                label="Delivery rate"
                value={`${stats?.deliveryRate ?? 0}%`}
                hint="Across all sent campaigns"
                icon={Activity}
                tone={stats && stats.deliveryRate >= 95 ? "success" : "neutral"}
              />
            </>
          )}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="font-serif text-xl text-foreground">Recent campaigns</h3>
            <p className="text-sm text-muted-foreground">
              Your last 5 broadcasts.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => router.push("/dashboard/campaigns")}
          >
            View all <ArrowRight className="size-3.5" />
          </Button>
        </div>

        {loading && !stats ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : stats && stats.recentCampaigns.length > 0 ? (
          <div className="bg-card border rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent / Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentCampaigns.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                  >
                    <TableCell className="pl-4 font-medium max-w-[260px] truncate">
                      {c.title}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.sentCount} / {c.totalRecip}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDate(c.sentAt || c.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={Send}
            title="No campaigns yet"
            description="Draft your first newsletter and broadcast it to your contacts from your own Gmail account."
            actionLabel="Create your first campaign"
            onAction={() => router.push("/dashboard/campaigns/new")}
          />
        )}
      </section>

      <section className="bg-muted rounded-2xl p-5 flex flex-col gap-2">
        <h4 className="font-medium text-foreground">Gmail sending limits</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Gmail free allows about 500 emails/day; Google Workspace allows about
          2,000/day. MailCast rate-limits to 4 emails per second to protect your
          account from being flagged. Keep your lists well under these limits
          and avoid sudden spikes.
        </p>
      </section>
    </div>
  );
}
