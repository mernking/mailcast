"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/use-app-store";
import { Reveal } from "./reveal";

export function FinalCta() {
  const setView = useAppStore((s) => s.setView);

  return (
    <section className="relative overflow-hidden bg-background">
      <div aria-hidden className="absolute inset-0 bg-dotted opacity-70" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="font-serif text-4xl leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Bring your list. Send from Gmail.
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Import from anywhere, write once, and broadcast today. No relay,
              no per-seat fees, no waiting on DNS.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => setView("app")}
              >
                Get started
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="h-11 rounded-full px-6 text-sm font-medium text-foreground hover:bg-accent"
                asChild
              >
                <a href="#features">Read the docs</a>
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
