import Link from "next/link";
import { Logo } from "./logo";

const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Blog", href: "/blog" },
];

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The simplest way to broadcast newsletters from your own Gmail.
            </p>
          </div>

          {/* Product column */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Contact
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="mailto:hello@mailcast.app"
                  className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                >
                  hello@mailcast.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>&copy; 2026 MailCast. Built for creators who already have Gmail.</p>
          <p className="text-muted-foreground/80">
            Comparisons use typical Gmail sending limits.
          </p>
        </div>
      </div>
    </footer>
  );
}
