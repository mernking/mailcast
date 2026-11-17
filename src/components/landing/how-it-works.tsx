"use client";

import { KeyRound, Users, Send, type LucideIcon } from "lucide-react";
import { Reveal } from "./reveal";

type Step = {
  num: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    num: "01",
    icon: KeyRound,
    title: "Connect Gmail",
    description:
      "Generate an app password in your Google account, paste it once. We encrypt it at rest with AES-256-GCM and never expose it to the client.",
  },
  {
    num: "02",
    icon: Users,
    title: "Import contacts",
    description:
      "Paste emails directly or upload a CSV. Tag and segment freely. Duplicates are removed and every address is validated before you send.",
  },
  {
    num: "03",
    icon: Send,
    title: "Write & send",
    description:
      "Compose in markdown, preview the rendered email, and broadcast to your whole list in a single click. Each message is sent individually.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border bg-card py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-foreground md:text-5xl">
              Live in three steps
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-4 text-base text-muted-foreground">
              From zero to your first broadcast in under five minutes. No DNS
              records to configure, no relay to provision.
            </p>
          </Reveal>
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Dashed connector on desktop */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-12 hidden border-t border-dashed border-border md:block"
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.08}>
              <article className="relative flex h-full flex-col rounded-2xl border border-border bg-background p-8">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-4xl text-foreground/85">
                    {step.num}
                  </span>
                  <span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                    <step.icon className="size-5" strokeWidth={2} />
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
