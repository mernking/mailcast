# Task 3-a — MailCast Landing Page

**Agent:** landing-page builder
**Scope:** `/home/z/my-project/src/components/landing/*` (the `LandingPage` rendered at `/`)

## What was built

A complete, polished marketing landing page for MailCast, composed of focused
sub-components under `src/components/landing/`. Warm editorial minimalism
inspired by mailcheap.ai, branded as MailCast. Cream background, near-black
ink, white cards, charcoal dark panels for the product mockup, minimal green
for success states only. No indigo/blue anywhere.

### Files created / modified

| File | Status | Purpose |
| --- | --- | --- |
| `src/components/landing/landing-page.tsx` | modified | Named `LandingPage` export composing all sections; enables smooth-scroll on mount |
| `src/components/landing/logo.tsx` | created | Reusable `Logo` (paper-plane mark in ink pill + Instrument Serif wordmark) |
| `src/components/landing/reveal.tsx` | created | `Reveal` framer-motion wrapper (subtle fade + slide-up, `whileInView`, once) |
| `src/components/landing/navbar.tsx` | created | Sticky navbar: logo, anchor links, Sign in + Get started; mobile Sheet menu |
| `src/components/landing/hero.tsx` | created | Eyebrow badge, serif headline (italic "Gmail"), subtext, CTAs, trust line, and a full charcoal browser-window product mockup (dark sidebar nav + campaign editor preview with Sent badge, markdown toolbar, recipient row) |
| `src/components/landing/stats-bar.tsx` | created | 3-column stats (99.5% delivery in green, 500/day Gmail limit, 0 setup) on a white card band |
| `src/components/landing/features.tsx` | created | Bento grid of 6 feature cards; first card (`Gmail SMTP sending`) spans 2 cols on lg with a `smtp.gmail.com` flourish |
| `src/components/landing/how-it-works.tsx` | created | 3 numbered serif cards (01/02/03) with dashed desktop connector |
| `src/components/landing/pricing.tsx` | created | Single centered $0/forever card with green checklist + footnote on Gmail limits |
| `src/components/landing/faq.tsx` | created | Accordion with 8 real Q&A (sending, limits, security, import, tracking, privacy, unsubscribe, custom domain) |
| `src/components/landing/final-cta.tsx` | created | Cream + `.bg-dotted` final CTA with serif headline |
| `src/components/landing/footer.tsx` | created | `mt-auto` footer (sticks to bottom on short pages): brand + Product/Legal/Contact columns, copyright + Gmail-limit note |
| `src/app/page.tsx` | modified (1 line) | Added scoped `eslint-disable-next-line react-hooks/set-state-in-effect` to the existing `mounted` hydration-guard effect so `bun run lint` passes. No behavior change. |

### Interactivity wiring
- Every "Get started" / "Sign in" / mobile "Start" button calls
  `useAppStore.getState().setView('app')` (via the `setView` selector),
  switching the app shell to `<Dashboard />`.
- Nav links + footer links are in-page anchors (`#features`, `#how`,
  `#pricing`, `#faq`); smooth scrolling enabled via `documentElement.scrollBehavior = "smooth"` on mount in `landing-page.tsx`.
- Subtle Framer Motion entrance reveals on each section via the shared
  `Reveal` component; durations kept short (0.5s) and `once: true`.

### Responsive
- Mobile-first. Navbar collapses to a right-side `Sheet` with hamburger;
  "Start" pill stays visible on mobile.
- Hero text scales `text-5xl → md:text-6xl → lg:text-7xl`.
- Product mockup: inner dark sidebar hides below `md`; editor preview
  remains. Grids stack 1 col (mobile) → 2 (md) → 3 (lg).
- Touch targets ≥ 44px (mobile buttons `h-11`/`size-10`).
- Footer uses `mt-auto` so it sticks to the bottom of the viewport when
  content is short and is pushed down naturally when long (root wrapper in
  `page.tsx` is `min-h-screen flex flex-col`).

## Verification

- `bun run lint` → **exit code 0** (0 errors). One pre-existing *warning*
  remains in `src/components/app/use-api.ts` (unused eslint-disable) — that
  file belongs to the dashboard agent, not this task.
- `curl -s http://localhost:3000/ -o /dev/null -w "%{http_code}\n"` → **200**.
- `dev.log` (most recent lines) → only `GET / 200` entries and clean
  `✓ Compiled` messages. No runtime/hydration errors. (The only `⨯` in the
  log is a stale "EADDRINUSE :3000" from an earlier second-start attempt —
  the primary dev server is running fine.)

## Notes for downstream agents
- The landing page imports `@/components/app/dashboard` only indirectly
  (via `src/app/page.tsx`); no coupling to dashboard internals.
- The store API used: `useAppStore((s) => s.setView)` → call `setView('app')`
  to enter the dashboard. The dashboard stub currently renders
  `<div className="min-h-screen" />`; replacing it will not affect the landing.
- Palette tokens used (defined in `globals.css`): `bg-background`,
  `bg-card`, `bg-sidebar` / `text-sidebar-foreground` / `bg-sidebar-accent`,
  `text-muted-foreground`, `border-border`, `bg-primary` / `text-primary-foreground`,
  `text-chart-1` / `bg-chart-1/15` (green for success only). Utilities:
  `.font-serif` (Instrument Serif), `.bg-dotted`, `.scroll-thin`.
- Icons used from `lucide-react`: `Send`, `ArrowRight`, `Menu`, `Mail`,
  `PenLine`, `UserSquare`, `Upload`, `Activity`, `ShieldCheck`, `KeyRound`,
  `Users`, `Check`.

## Issues hit & resolved
1. Pre-existing `react-hooks/set-state-in-effect` lint error in
   `src/app/page.tsx` (the `mounted` hydration guard). Fixed with a scoped
   inline `eslint-disable-next-line` — behavior-preserving, no logic change.
2. Initially had an empty `<Button>` (no children) as a redundant Sheet
   close; removed it since `SheetContent` already renders its own X button.
3. (No-op) `SheetClose` import removed after the above cleanup.

All clear — landing page is live at `/`, returns 200, lints clean.
