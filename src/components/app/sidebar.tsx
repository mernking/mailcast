"use client";

import {
  LayoutDashboard,
  Send,
  Users,
  Mail,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAppStore, type DashboardSection } from "@/hooks/use-app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", icon: Send },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "senders", label: "Senders", icon: Mail },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function NavButton({ item }: { item: NavItem }) {
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const openCampaignEditor = useAppStore((s) => s.openCampaignEditor);
  const active = section === item.id;
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => {
        if (item.id === "campaigns") {
          // Reset any open editor when the user re-enters the campaigns section.
          openCampaignEditor(null);
        } else {
          setSection(item.id);
        }
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </button>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <button
          type="button"
          onClick={() => {
            setView("landing");
            onNavigate?.();
          }}
          className="flex items-center gap-2 group"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
            <Send className="size-4" />
          </span>
          <span className="font-serif text-xl text-sidebar-foreground leading-none">
            MailCast
          </span>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </nav>

      <div className="px-3 pb-5">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 flex flex-col gap-2">
          <div className="text-xs text-sidebar-foreground/80">
            Free plan &middot; Bring your own Gmail
          </div>
          <div className="text-[11px] text-sidebar-foreground/50">
            Rate-limited to 4 emails/sec.
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start px-0 text-sidebar-foreground/70 hover:bg-transparent hover:text-sidebar-foreground h-auto py-1"
            onClick={() => {
              setView("landing");
              onNavigate?.();
            }}
          >
            <span className="text-xs underline-offset-2 hover:underline">
              Back to site
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
