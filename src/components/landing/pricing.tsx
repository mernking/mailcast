"use client";

import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/use-app-store";
import { Reveal } from "./reveal";

const INCLUDED = [
  "Unlimited contacts",
  "Unlimited campaigns",
  "Send from your own Gmail",
  "Markdown editor + live preview",
  "Per-recipient delivery tracking",
  "Encrypted app password storage",
];

export function Pricing() {
  const setView = useAppStore((s) => s.setView);

  return (
    <section id="pricing" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pricing
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-foreground md:text-5xl">
              Simple, honest pricing
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-4 text-base text-muted-foreground">
              You bring the Gmail. We bring the broadcast. No per-seat fees, no
              usage tiers, no surprises.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} y={24}>
          <div className="mx-auto mt-12 max-w-xl">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center md:p-10">
              {/* subtle dotted corner accent */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 size-40 bg-dotted opacity-50"
              />
              <div className="relative">
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Free while building
                </span>

                <div className="mt-6 flex items-end justify-center gap-1">
                  <span className="font-serif text-6xl tracking-tight text-foreground md:text-7xl">
                    $0
                  </span>
                  <span className="mb-2 text-sm text-muted-foreground">
                    /forever
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  No credit card required to start.
                </p>

                <ul className="mx-auto mt-8 grid max-w-sm gap-3 text-left">
                  {INCLUDED.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-foreground"
                    >
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-chart-1/15 text-chart-1">
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  className="mt-8 h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  onClick={() => setView("app")}
                >
                  Get started
                  <ArrowRight className="size-4" />
                </Button>

                <p className="mt-5 text-xs text-muted-foreground">
                  You pay Google nothing extra. Gmail free allows ~500
                  emails/day; Google Workspace ~2,000/day.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Need to send more than Gmail allows?{" "}
              <span className="text-foreground">
                Bring a custom SMTP relay (coming soon).
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
