"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Sidebar } from "./sidebar";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/campaigns": "Campaigns",
  "/dashboard/contacts": "Contacts",
  "/dashboard/forms": "Forms",
  "/dashboard/automations": "Automations",
  "/dashboard/senders": "Senders",
  "/dashboard/media": "Media",
  "/dashboard/settings": "Settings",
};

interface TopbarProps {
  action?: React.ReactNode;
}

export function Topbar({ action }: TopbarProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  let title = TITLES[pathname] ?? "Dashboard";
  if (!title || title === "Dashboard") {
    const seg = pathname.split("/").filter(Boolean);
    title = TITLES[`/${seg[0] ?? "dashboard"}/${seg[1] ?? ""}`] ?? "Dashboard";
  }
  if (pathname.startsWith("/dashboard/campaigns/") && pathname !== "/dashboard/campaigns") {
    title = pathname.endsWith("/new") ? "New campaign" : "Edit campaign";
  }

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-30 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <h2 className="font-serif text-lg text-foreground truncate leading-none">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-2">{action}</div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 border-sidebar-border"
          aria-description="MailCast navigation"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="h-full">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
