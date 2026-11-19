"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "./reveal";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How does sending from Gmail work?",
    a: "You generate an app password inside your Google account and add it to MailCast once. We then send through Gmail's official SMTP gateway (smtp.gmail.com) using TLS. Your plain Gmail password is never stored — only the scoped app password, which is encrypted at rest.",
  },
  {
    q: "What are Gmail's sending limits?",
    a: "Free Gmail accounts can send roughly 500 emails per rolling 24 hours; Google Workspace accounts can send around 2,000 per day. MailCast rate-limits your broadcasts automatically so you stay safely under the threshold and avoid account flags.",
  },
  {
    q: "Is my app password safe?",
    a: "Yes. App passwords are encrypted at rest with AES-256-GCM and never returned to the browser. They are used only at send time to authenticate with Gmail's SMTP gateway and are scoped to a single Google account.",
  },
  {
    q: "Can I import my existing list?",
    a: "Yes. Paste emails directly, or paste a CSV with name and address columns. We dedupe against your existing contacts and validate every address before it is added.",
  },
  {
    q: "Does it track opens and clicks?",
    a: "MailCast tracks per-recipient delivery status (sent, delivered, failed) today. Open and click tracking raise privacy concerns, so they are optional and off by default — you can enable them per campaign.",
  },
  {
    q: "Do recipients see each other?",
    a: "No. Every email is composed and sent individually with its own merge tags. There is no BCC list and no shared header — each recipient only ever sees their own address in the To field.",
  },
  {
    q: "Is there an unsubscribe link?",
    a: "Yes. Every email includes a List-Unsubscribe header and a visible footer link, so recipients can opt out in one click and your list stays healthy and compliant.",
  },
  {
    q: "Can I use a custom domain?",
    a: "Custom-domain sending via a dedicated SMTP relay is coming soon. Today MailCast sends from your own Gmail address, which is what makes delivery so reliable.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-border bg-card py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              FAQ
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-foreground md:text-5xl">
              Questions
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-4 text-base text-muted-foreground">
              Everything you might want to know before sending your first
              broadcast.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} y={20}>
          <Accordion
            type="single"
            collapsible
            className="mt-10 w-full rounded-2xl border border-border bg-background px-5 md:px-6"
          >
            {FAQS.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`item-${i}`}
                className="border-border last:border-b-0"
              >
                <AccordionTrigger className="text-left text-[15px] font-medium text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
