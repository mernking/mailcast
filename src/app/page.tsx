"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import { LandingPage } from "@/components/landing/landing-page";
import { Dashboard } from "@/components/app/dashboard";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch from the persisted store value.
  // This is a deliberate hydration guard (server + first client render
  // both return the neutral div), so the setState-in-effect is intended.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {view === "app" ? <Dashboard /> : <LandingPage />}
    </div>
  );
}
