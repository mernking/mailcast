"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppView = "landing" | "app";

interface AppState {
  view: AppView;
  setView: (v: AppView) => void;
  /** Active dashboard section */
  section: DashboardSection;
  setSection: (s: DashboardSection) => void;
  /** When set, the dashboard opens this campaign in the editor */
  editingCampaignId: string | null;
  openCampaignEditor: (id: string | null) => void;
}

export type DashboardSection =
  | "overview"
  | "campaigns"
  | "contacts"
  | "senders"
  | "forms"
  | "automations"
  | "settings";

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "landing",
      setView: (v) => set({ view: v }),
      section: "overview",
      setSection: (s) => set({ section: s }),
      editingCampaignId: null,
      openCampaignEditor: (id) =>
        set({ editingCampaignId: id, section: "campaigns" }),
    }),
    {
      name: "mailcast-view",
      partialize: (s) => ({ view: s.view, section: s.section }),
    }
  )
);
