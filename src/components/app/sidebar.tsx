"use client";

import {
  LayoutDashboard,
  Send,
  Users,
  Mail,
  RectangleHorizontal,
  Workflow,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
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
  { id: "forms", label: "Forms", icon: RectangleHorizontal },
  { id: "automations", label: "Automations", icon: Workflow },
  { id: "senders", label: "Senders", icon: Mail },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function NavButton({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
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
          openCampaignEditor(null);
        } else {
          setSection(item.id);
        }
      }}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={cn(
        "w-full flex items-center rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const setView = useAppStore((s) => s.setView);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header: logo + collapse toggle */}
      <div
        className={cn(
          "border-b border-sidebar-border py-4",
          collapsed ? "px-2 flex flex-col items-center gap-2" : "px-5 flex items-center justify-between"
        )}
      >
        <button
          type="button"
          onClick={() => {
            setView("landing");
            onNavigate?.();
          }}
          className="flex items-center gap-2 group"
          aria-label="Back to site"
          title="Back to site"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
            <Send className="size-4" />
          </span>
          {!collapsed && (
            <span className="font-serif text-xl text-sidebar-foreground leading-none">
              MailCast
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="px-2 py-2 flex justify-center">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => (
          <NavButton key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className={cn("pb-5", collapsed ? "px-2" : "px-3")}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => {
              setView("landing");
              onNavigate?.();
            }}
            aria-label="Back to site"
            title="Back to site"
            className="w-full flex justify-center rounded-lg py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
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
        )}
      </div>
    </div>
  );
}
