"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Send,
  Users,
  Mail,
  Image as ImageIcon,
  RectangleHorizontal,
  Workflow,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore, type DashboardSection } from "@/hooks/use-app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiFetch } from "./use-api";

interface NavItem {
  id: DashboardSection;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", href: "/dashboard/campaigns", icon: Send },
  { id: "contacts", label: "Contacts", href: "/dashboard/contacts", icon: Users },
  { id: "forms", label: "Forms", href: "/dashboard/forms", icon: RectangleHorizontal },
  { id: "automations", label: "Automations", href: "/dashboard/automations", icon: Workflow },
  { id: "senders", label: "Senders", href: "/dashboard/senders", icon: Mail },
  { id: "media", label: "Media", href: "/dashboard/media", icon: ImageIcon },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

function NavButton({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active = item.href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
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
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
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
        <Link
          href="/"
          onClick={() => onNavigate?.()}
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
        </Link>
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
          <Link
            href="/"
            onClick={() => onNavigate?.()}
            aria-label="Back to site"
            title="Back to site"
            className="w-full flex justify-center rounded-lg py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
        ) : (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 flex flex-col gap-2">
            <div className="text-xs text-sidebar-foreground/80">
              Free plan &middot; Bring your own Gmail
            </div>
            <div className="text-[11px] text-sidebar-foreground/50">
              Rate-limited to 4 emails/sec.
            </div>
            <Link
              href="/"
              onClick={() => onNavigate?.()}
              className="text-xs text-sidebar-foreground/70 underline-offset-2 hover:underline"
            >
              Back to site
            </Link>
            <SignOutButton />
          </div>
        )}
      </div>
    </div>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="justify-start px-0 text-sidebar-foreground/70 hover:bg-transparent hover:text-sidebar-foreground h-auto py-1"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiFetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="text-xs underline-offset-2 hover:underline">
        {busy ? "Signing out…" : "Sign out"}
      </span>
    </Button>
  );
}
