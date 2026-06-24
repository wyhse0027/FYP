# Phase 6 — Luxury UI/UX Redesign — Design Spec

**Status:** approved direction (2026-06-24). Sketch-first: produce a style guide + Home/Product
HTML mockups for owner review/try, then plan implementation across the core flow.

## Goal

Elevate the Eleganza / GERAIN CHAN storefront from "intermediate" to a polished, **demo-grade
luxury** experience with the restraint of **Dior / Chanel** branding — couture typography,
disciplined gold, generous negative space, refined motion. Visual + motion elevation **only**;
**flows, routes, markup logic, and the API are unchanged**.

## Scope

**Design system + core demo flow first.** Build the reusable design language + a small set of
shared "luxe" primitives, then fully polish the demo-critical pages: Home, Shop, Product, Quiz,
Cart, Checkout, Account/Orders, Login/Signup, plus a consistent admin shell (dashboard + tables).
Remaining pages inherit the system but are not pixel-perfected this phase.

This spec's **first reviewable deliverable** is narrower: a **style guide + Home + Product**
standalone HTML mockups.

## Aesthetic direction (locked)

Dark-opulent + gold + glass (the existing "choice 1"), refined toward Dior/Chanel restraint —
luxury through restraint, not more gold.

- **Palette:** consolidate on the existing `tailwind.config.js` `luxury` tokens —
  `bg #070B14`, `panel #0B1222`, `panel2 #0E1830`, `gold #D4AF37`, `gold2 #F3D37A`,
  `champagne #F7E7CE`. **Retire stray cyan/pink accents** (currently in the Home filter pills);
  one disciplined metallic accent across the app.
- **Typography (couture pairing):** a high-contrast **Didone/transitional serif display**
  (e.g. Cormorant Garamond or Playfair Display) for headings; a quiet **grotesque sans**
  (e.g. Inter or Jost) for body/UI. Large headings, wide tracking on uppercase labels, hairline
  gold rules. This is the primary lever for the Dior/Chanel feel.
- **Surfaces & light:** restrained glassmorphism (backdrop blur + 1px gold-tint border),
  soft gold radial glow, deep soft shadows (the existing `shadow-gold`). Gold as a finishing
  accent, never a fill.
- **Motion:** refined, slow easing — fade/rise reveals, ~700ms image zooms, subtle gold shimmer
  on hover. Reuse the existing framer-motion patterns (staged reveal, skeletons), calmed down.

## System structure (reusable, not per-page hacks)

- Extend the Tailwind theme: tokens (already partly present), font families, spacing rhythm,
  shadows, gradients.
- A small set of shared primitives pages compose: `Section`, `Button` (primary/ghost),
  `Card`, `Input`, `Pill`/filter chip, `Badge`, `Divider`/hairline rule.
- Apply across the core-flow pages. Markup structure and data flow stay as-is; only presentation
  (class names, wrapper components, motion) changes.

## Current-state notes (from code review)

- `tailwind.config.js` already defines `luxury` colors + `shadow-gold` + gold radial/gradient —
  partially scaffolded, inconsistently used.
- `MainPage.js` (Home) already uses serif headings, gold accents, glass cards, framer-motion
  staged reveal + skeletons — good bones; but background is an ad-hoc navy
  (`#0a1628→#0c1a3a→#0e1f4a`) and **filter pills use cyan/pink** (off-brand).
- `AboutPage.js` uses a different ad-hoc navy (`#0c1a3a`) — inconsistency the system removes.

## Reviewable deliverables (the "sketch")

1. **Style guide** (`docs/superpowers/mockups/phase-6/style-guide.html`) — palette, type scale,
   components, motion notes.
2. **Home mockup** (`.../home.html`) — header, search, hero, filters (gold system), product grid.
3. **Product mockup** (`.../product.html`) — gallery, AR entry, price/add-to-cart, notes/tags,
   reviews.

Standalone HTML/CSS (Tailwind via CDN + Google Fonts), open directly in a browser. Zero risk to
the app. Owner reviews/tries → iterate → then `writing-plans` for implementation.

## Constraints

- Visual + motion only. No change to routes, API calls, state logic, or data shapes.
- Match the existing stack (React 19 CRA, Tailwind, framer-motion, swiper). No new heavy deps
  without approval (Google Fonts + Tailwind theme extension are in-scope).
- Responsive + accessible (contrast, focus states, reduced-motion).

## Out of scope (this phase)

- Backend/API changes; new features or flow changes; the non-core pages' pixel polish;
  the deferred `127.0.0.1` About-page media fix (tracked separately).

## Workflow

1. Generate the style guide + Home + Product mockups (UI/UX skill). 2. Owner reviews/tries,
iterate. 3. `writing-plans` → implementation plan for the core-flow pages. 4. Implement on
`phase-6-ui-redesign`, manual visual verification, review, merge + tag.
