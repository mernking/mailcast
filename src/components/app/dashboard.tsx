"use client";

import { useState } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Overview } from "./overview";
import { CampaignList } from "./campaigns/campaign-list";
import { CampaignEditor } from "./campaigns/campaign-editor";
import { ContactList } from "./contacts/contact-list";
import { SenderList } from "./senders/sender-list";
import { Settings } from "./settings";
import { FormsSection } from "./forms/forms-section";
import { AutomationsSection } from "./automations/automations-section";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const section = useAppStore((s) => s.section);
  const editingCampaignId = useAppStore((s) => s.editingCampaignId);
  const openCampaignEditor = useAppStore((s) => s.openCampaignEditor);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);

  // The "Add Gmail sender" dialog can be opened from the topbar action button
  // or from an empty-state inside the SenderList.
  const [addSenderOpen, setAddSenderOpen] = useState(false);

  let content: React.ReactNode = null;
  let action: React.ReactNode = null;

  if (section === "overview") {
    content = <Overview />;
  } else if (section === "campaigns") {
    if (editingCampaignId) {
      content = <CampaignEditor campaignId={editingCampaignId} />;
    } else {
      content = <CampaignList />;
      action = (
        <Button
          className="rounded-full"
          onClick={() => openCampaignEditor("new")}
        >
          <Plus className="size-4" /> New campaign
        </Button>
      );
    }
  } else if (section === "contacts") {
    content = <ContactList />;
  } else if (section === "forms") {
    content = <FormsSection />;
  } else if (section === "automations") {
    content = <AutomationsSection />;
  } else if (section === "senders") {
    content = (
      <SenderList
        addDialogOpen={addSenderOpen}
        onAddDialogChange={setAddSenderOpen}
      />
    );
    action = (
      <Button className="rounded-full" onClick={() => setAddSenderOpen(true)}>
        <Plus className="size-4" /> Add Gmail sender
      </Button>
    );
  } else if (section === "settings") {
    content = <Settings />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar (collapsible) */}
      <aside
        className={cn(
          "hidden md:block shrink-0 sticky top-0 h-screen transition-[width] duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar action={action} />
        <main className="flex-1 overflow-y-auto scroll-thin p-4 md:p-8">
          {content}
        </main>
      </div>
    </div>
  );
}
