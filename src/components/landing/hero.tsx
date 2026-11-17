"use client";

import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/use-app-store";
import { Reveal } from "./reveal";

function HeroMockup() {
  return (
    <div className="relative mx-auto mt-14 max-w-5xl">
      {/* Soft ambient glow behind the window — kept warm/neutral */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-6 bottom-0 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,0,0,0.06),transparent_70%)]"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-sidebar text-sidebar-foreground shadow-2xl shadow-black/10">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-sidebar-foreground/20" />
            <span className="size-2.5 rounded-full bg-sidebar-foreground/20" />
            <span className="size-2.5 rounded-full bg-sidebar-foreground/20" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-sidebar-accent/70 px-3 py-1 text-xs text-sidebar-foreground/70">
            <span className="size-1.5 rounded-full bg-chart-1" />
            mailcast.app/campaigns
          </div>
        </div>

        {/* App body */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
          {/* Sidebar nav */}
          <aside className="hidden border-r border-sidebar-border p-3 md:block">
            <div className="mb-4 flex items-center gap-2 px-2">
              <span className="grid size-6 place-items-center rounded-md bg-sidebar-foreground/10 text-sidebar-foreground">
                <Send className="size-3.5" />
              </span>
              <span className="font-serif text-sm">MailCast</span>
            </div>
            <nav className="flex flex-col gap-0.5">
              {[
                { label: "Overview", active: false },
                { label: "Campaigns", active: true },
                { label: "Contacts", active: false },
                { label: "Senders", active: false },
                { label: "Settings", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] " +
                    (item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60")
                  }
                >
                  <span
                    className={
                      "size-1.5 rounded-full " +
                      (item.active ? "bg-chart-1" : "bg-sidebar-foreground/20")
                    }
                  />
                  {item.label}
                </div>
              ))}
            </nav>
            <div className="mt-6 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
              <div className="text-[11px] uppercase tracking-wide text-sidebar-foreground/50">
                Today
              </div>
              <div className="mt-1 font-serif text-xl text-sidebar-foreground">
                412 sent
              </div>
              <div className="mt-0.5 text-xs text-chart-1">99.5% delivered</div>
            </div>
          </aside>

          {/* Main editor preview */}
          <div className="p-5 md:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-sidebar-foreground/45">
                  Campaign
                </div>
                <div className="font-serif text-lg text-sidebar-foreground">
                  April issue — what we shipped
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-1/15 px-2.5 py-1 text-xs font-medium text-chart-1">
                <span className="size-1.5 rounded-full bg-chart-1" />
                Sent
              </span>
            </div>

            {/* Subject row */}
            <div className="mb-4 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
              <div className="text-[11px] uppercase tracking-wide text-sidebar-foreground/45">
                Subject
              </div>
              <div className="mt-0.5 text-sm text-sidebar-foreground">
                April issue — three things we shipped this month
              </div>
            </div>

            {/* Markdown toolbar hint */}
            <div className="mb-3 flex items-center gap-1 border-b border-sidebar-border pb-2 text-sidebar-foreground/50">
              <span className="rounded px-1.5 py-0.5 text-xs font-semibold hover:bg-sidebar-accent">H1</span>
              <span className="rounded px-1.5 py-0.5 text-xs hover:bg-sidebar-accent">B</span>
              <span className="rounded px-1.5 py-0.5 text-xs italic hover:bg-sidebar-accent">I</span>
              <span className="rounded px-1.5 py-0.5 text-xs hover:bg-sidebar-accent">&lt;/&gt;</span>
              <span className="ml-auto text-[11px]">Markdown preview</span>
            </div>

            {/* Content skeleton lines */}
            <div className="space-y-2.5">
              <div className="h-3 w-1/3 rounded-full bg-sidebar-foreground/20" />
              <div className="h-2.5 w-full rounded-full bg-sidebar-foreground/12" />
              <div className="h-2.5 w-11/12 rounded-full bg-sidebar-foreground/12" />
              <div className="h-2.5 w-4/5 rounded-full bg-sidebar-foreground/12" />
              <div className="h-3 w-1/4 rounded-full bg-sidebar-foreground/20" />
              <div className="h-2.5 w-full rounded-full bg-sidebar-foreground/12" />
              <div className="h-2.5 w-3/4 rounded-full bg-sidebar-foreground/12" />
            </div>

            {/* Recipient row */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-sidebar-border pt-4">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["#e7d9c0", "#cdbb9b", "#b7a584", "#d8c6a8"].map((c) => (
                    <span
                      key={c}
                      className="size-6 rounded-full border border-sidebar"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-xs text-sidebar-foreground/70">
                  Sending to <span className="text-sidebar-foreground">1,284</span> recipients
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sidebar-foreground/10 px-3 py-1.5 text-xs text-sidebar-foreground/70">
                <Send className="size-3.5" />
                Sent via you@gmail.com
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const setView = useAppStore((s) => s.setView);

  return (
    <section id="top" className="relative overflow-hidden bg-background">
      {/* dotted texture overlay */}
      <div aria-hidden className="absolute inset-0 bg-dotted opacity-70" />
      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-1 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-chart-1" />
            </span>
            Send from your own Gmail — no SMTP relay
          </div>

          {/* Headline */}
          <Reveal>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Broadcast your newsletter straight from{" "}
              <em className="italic text-foreground">Gmail</em>
            </h1>
          </Reveal>

          {/* Subtext */}
          <Reveal delay={0.05}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Bring your Gmail app password, import your list, write once, and
              send to thousands. No relay, no per-seat pricing. You only pay
              for the emails you actually send.
            </p>
          </Reveal>

          {/* CTA row */}
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
                <a href="#how">See how it works</a>
              </Button>
            </div>
          </Reveal>

          {/* Trust line */}
          <Reveal delay={0.15}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <span>Free while building</span>
              <span aria-hidden className="size-1 rounded-full bg-border" />
              <span>No credit card</span>
              <span aria-hidden className="size-1 rounded-full bg-border" />
              <span>Encrypted app password</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15} y={24}>
          <HeroMockup />
        </Reveal>
      </div>
    </section>
  );
}
