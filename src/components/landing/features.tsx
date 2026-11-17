"use client";

import {
  Mail,
  PenLine,
  UserSquare,
  Upload,
  Activity,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./reveal";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  wide?: boolean;
  flourish?: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: Mail,
    title: "Gmail SMTP sending",
    description:
      "Use your own Gmail address and an app password. No third-party relay, no API keys to babysit — your mail goes out through Google's own infrastructure.",
    wide: true,
    flourish: (
      <div className="mt-5 rounded-xl border border-border bg-muted/60 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-card px-2 py-1 font-mono text-[11px] text-foreground">
            you@gmail.com
          </span>
          <span className="text-muted-foreground">via</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-card px-2 py-1 font-mono text-[11px] text-foreground">
            smtp.gmail.com:587
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-chart-1" />
          TLS encrypted · App-password authenticated
        </div>
      </div>
    ),
  },
  {
    icon: PenLine,
    title: "Rich markdown editor",
    description:
      "Write in markdown with live preview. Headings, lists, links, and images — rendered exactly as recipients will see them.",
  },
  {
    icon: UserSquare,
    title: "Merge tags",
    description:
      "Personalize every email with {{name}}, {{first_name}}, and {{email}}. Per-recipient, never BCC'd.",
  },
  {
    icon: Upload,
    title: "Bulk import",
    description:
      "Paste a CSV or add emails one by one. We dedupe automatically and validate every address.",
  },
  {
    icon: Activity,
    title: "Per-recipient tracking",
    description:
      "See exactly who received, who failed, and why — down to the individual email, not just a total.",
  },
  {
    icon: ShieldCheck,
    title: "Delivery & compliance",
    description:
      "DKIM and SPF come free via Gmail. We add List-Unsubscribe headers and a plain-text fallback to every send.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Features
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-foreground md:text-5xl">
              Everything you need to broadcast
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-4 text-base text-muted-foreground">
              A focused toolkit, not a sprawling suite. Each piece exists
              because sending from Gmail demands it.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.04}>
              <article
                className={
                  "flex h-full flex-col rounded-2xl border border-border bg-card p-6 md:p-8 " +
                  (feature.wide ? "lg:col-span-2" : "")
                }
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                    <feature.icon className="size-5" strokeWidth={2} />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                {feature.flourish}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
