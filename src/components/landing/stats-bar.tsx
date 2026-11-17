"use client";

import { Reveal } from "./reveal";

const STATS = [
  {
    value: "99.5%",
    label: "Delivery rate",
    accent: true,
  },
  {
    value: "500 / day",
    label: "Gmail free limit",
    sub: "Workspace ~2,000/day",
  },
  {
    value: "0 setup",
    label: "Bring your own app password",
  },
] as const;

export function StatsBar() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center px-6 py-10 text-center md:py-12"
              >
                <dd
                  className={
                    "font-serif text-4xl tracking-tight md:text-5xl " +
                    (stat.accent ? "text-chart-1" : "text-foreground")
                  }
                >
                  {stat.value}
                </dd>
                <dt className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </dt>
                {"sub" in stat && stat.sub ? (
                  <dd className="mt-1 text-xs text-muted-foreground/80">
                    {stat.sub}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
