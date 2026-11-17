"use client";

import { useEffect } from "react";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { StatsBar } from "./stats-bar";
import { Features } from "./features";
import { HowItWorks } from "./how-it-works";
import { Pricing } from "./pricing";
import { Faq } from "./faq";
import { FinalCta } from "./final-cta";
import { Footer } from "./footer";

/**
 * MailCast landing page — warm editorial minimalism.
 * Composes all sections. The footer uses `mt-auto` so it sticks to
 * the bottom of the viewport when content is short (the root wrapper
 * in `src/app/page.tsx` is `min-h-screen flex flex-col`).
 */
export function LandingPage() {
  // Enable smooth scrolling for in-page anchor navigation.
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollBehavior = "";
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <StatsBar />
        <Features />
        <HowItWorks />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
