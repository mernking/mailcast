"use client";

import { useState } from "react";
import { Menu, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppStore } from "@/hooks/use-app-store";
import { Logo } from "./logo";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export function Navbar() {
  const setView = useAppStore((s) => s.setView);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="shrink-0" aria-label="MailCast home">
          <Logo />
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-full px-4 text-sm font-medium"
            onClick={() => setView("app")}
          >
            Sign in
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => setView("app")}
          >
            Get started
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            size="sm"
            className="h-9 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => setView("app")}
          >
            <Send className="size-4" />
            Start
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-10 rounded-full border-border"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 border-border bg-background p-0"
            >
              <div className="flex h-16 items-center border-b border-border px-4">
                <SheetTitle className="m-0">
                  <Logo />
                </SheetTitle>
              </div>
              <nav className="flex flex-col gap-1 p-3">
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
                <Button
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => {
                    setOpen(false);
                    setView("app");
                  }}
                >
                  Sign in
                </Button>
                <Button
                  className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    setOpen(false);
                    setView("app");
                  }}
                >
                  Get started
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
