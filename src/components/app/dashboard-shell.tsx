"use client";

import type { ReactNode } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

/** Shared sidebar + topbar layout for every /dashboard route. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "hidden md:block shrink-0 sticky top-0 h-screen transition-[width] duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto scroll-thin p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
