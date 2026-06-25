# Phase 6 — Luxury UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the Eleganza / GERAIN CHAN storefront (and a consistent admin shell) into a dark-opulent luxury experience with Dior/Chanel restraint — visual + motion only, flows and APIs untouched.

**Architecture:** Extend the existing Tailwind theme (tokens, couture fonts, shadows, keyframes) and a global CSS layer, build a small set of reusable React UI primitives under `web/src/components/ui/`, then apply those primitives + the token system across the core-flow pages. No route, data-fetch, state, or API changes — only presentation (class names, wrapper components, motion).

**Tech Stack:** React 19 (CRA `react-scripts 5`), Tailwind CSS 3, framer-motion, swiper, React Testing Library + Jest (via `react-scripts test`). Google Fonts: Playfair Display, Cormorant Garamond, Inter.

**Design source of truth:** `docs/superpowers/specs/2026-06-24-phase-6-ui-redesign-design.md` and the approved mockups `docs/superpowers/mockups/phase-6/{style-guide,home,product}.html`.

## Global Constraints

- **Visual + motion only.** Do NOT change routes, API calls (`web/src/lib/http.js` usage), state logic, data shapes, or component prop contracts consumed by logic. Only class names, wrapper markup, and motion change.
- **One metallic accent.** Use the `luxury` tokens only: `bg #070B14`, `panel #0B1222`, `panel2 #0E1830`, `gold #D4AF37`, `gold2 #F3D37A`, `champagne #F7E7CE`. The retired cyan/pink filter accents must NOT reappear.
- **Type:** headings `font-serif` → Playfair Display (couture), body Inter, optional Cormorant accent (`font-cormorant`).
- **Accessibility:** body text ≥ 16px; text-on-glass contrast ≥ 4.5:1; visible focus rings; every animation gated behind `prefers-reduced-motion`.
- **No new heavy deps.** Tailwind theme extension + Google Fonts only. No new npm packages without approval.
- **Stack idioms:** keep framer-motion staged-reveal patterns and skeletons (calmed down); match existing file/style conventions.
- **Testing gate (project hybrid, `CLAUDE.md` §5):** UI primitives with behavior (loading/active state) ship with React Testing Library tests; page-level look is verified by a documented manual script with observed results recorded in `progress.md`. Run frontend tests with `npm test -- --watchAll=false`; the production build must pass with `npm run build`.
- **Branch:** `phase-6-ui-redesign` → annotated tag `phase-6-ui-redesign`. Conventional Commits.

---

## File Structure

**Foundation (created/modified once):**
- Modify `web/public/index.html` — add Google Fonts preconnect + stylesheet link.
- Modify `web/tailwind.config.js` — extend `fontFamily` (serif→Playfair, cormorant→Cormorant, sans→Inter), add `keyframes`/`animation` for `shimmer`, `lux-pan`, `lux-sweep`, `spin`, `bar`.
- Modify `web/src/index.css` — set body font (Inter), add `@layer components` for `.btn-lux`, `.skel`, `.gold-rule`, and the `prefers-reduced-motion` guard.

**UI primitives (new, `web/src/components/ui/`):**
- `Spinner.js` — gold ring loader (size prop).
- `Skeleton.js` — gold-tinted shimmer block.
- `ProgressBar.js` — indeterminate gold bar.
- `Button.js` — `variant` (`primary` = btn-lux | `ghost`), `loading` (spinner + "…" + disabled).
- `Chip.js` — filter/sort chip with persistent `active` state + `onClick`.
- `Card.js` — glass surface wrapper.
- `Input.js` — glass text input with left icon slot.
- `Badge.js` — small uppercase tag (e.g. target).
- `Divider.js` — hairline gold rule.
- `SectionLabel.js` — wide-tracked uppercase gold label.
- `index.js` — barrel export.
- Tests: `web/src/components/ui/__tests__/{Button,Chip,Skeleton}.test.js`.

**Pages (modified, presentation only):** `MainPage.js` (Home), `ShopPage.js`, `ProductPage.js`, `QuizPage.js`, `CartPage.js`, `CheckoutPage.js`, `AccountPage.js`, `OrdersPage.js`, `LoginPage.js`, `SignupPage.js`; admin shell: `admin/AdminDashboardPage.js`, `admin/AdminProductsPage.js`, `admin/AdminOrdersPage.js`.

---

## Task 1: Type + theme + global CSS foundation

**Files:**
- Modify: `web/public/index.html` (head)
- Modify: `web/tailwind.config.js`
- Modify: `web/src/index.css`

**Interfaces:**
- Produces: Tailwind utilities `font-serif` (Playfair), `font-cormorant` (Cormorant), `font-sans` (Inter), `animate-shimmer`, `animate-lux-pan`, `animate-lux-sweep`, `animate-spin-gold`, `animate-bar`; global classes `.btn-lux`, `.skel`, `.gold-rule`.

- [ ] **Step 1: Add fonts to `web/public/index.html`** — inside `<head>`, before the closing tag:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Extend `web/tailwind.config.js`** — add to `theme.extend` (keep the existing `colors`/`boxShadow`/`backgroundImage`):

```js
fontFamily: {
  serif: ['"Playfair Display"', 'Georgia', 'serif'],
  cormorant: ['"Cormorant Garamond"', 'serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
},
keyframes: {
  shimmer: { '100%': { transform: 'translateX(100%)' } },
  'lux-pan': { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '220% 0' } },
  'lux-sweep': { '0%': { left: '-70%' }, '100%': { left: '130%' } },
  'spin-gold': { to: { transform: 'rotate(360deg)' } },
  bar: { '0%': { transform: 'translateX(-130%)' }, '100%': { transform: 'translateX(420%)' } },
},
animation: {
  shimmer: 'shimmer 1.6s infinite',
  'lux-pan': 'lux-pan 7s linear infinite',
  'spin-gold': 'spin-gold 0.9s linear infinite',
  bar: 'bar 1.4s ease-in-out infinite',
},
```

- [ ] **Step 3: Update `web/src/index.css`** — set the body font to Inter and add component classes. Replace the existing `body { ... font-family: ... }` block's font stack with Inter-first, and append before the password-icon rules:

```css
body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #070B14;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@layer components {
  /* Signature CTA: panning gold + sheen that sweeps and disappears on hover */
  .btn-lux {
    position: relative; overflow: hidden; color: #070B14;
    background: linear-gradient(110deg, #D4AF37, #F3D37A 45%, #D4AF37);
    background-size: 220% 100%; animation: lux-pan 7s linear infinite;
    box-shadow: 0 10px 34px rgba(212,175,55,0.28);
  }
  .btn-lux:hover { filter: brightness(1.06); }
  .btn-lux::after {
    content: ""; position: absolute; top: 0; left: -70%; width: 45%; height: 100%;
    background: linear-gradient(100deg, transparent, rgba(255,255,255,0.65), transparent);
    transform: skewX(-20deg);
  }
  .btn-lux:hover::after { animation: lux-sweep 0.9s ease; }
  /* Shimmer skeleton (gold-tinted, replaces grey pulse) */
  .skel { position: relative; overflow: hidden; background: rgba(255,255,255,0.05); }
  .skel::after {
    content: ""; position: absolute; inset: 0; transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, rgba(212,175,55,0.22), transparent);
    animation: shimmer 1.6s infinite;
  }
  /* Hairline gold rule */
  .gold-rule { height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd web && npm run build`
Expected: "Compiled successfully" / "The build folder is ready". (Warnings OK, no errors.)

- [ ] **Step 5: Manual visual check (documented)**

Run `cd web && npm start`, open `http://localhost:3000`. Confirm: body text renders in Inter; no console errors; the app still loads. Record "fonts load, app renders" in `progress.md` at execution time.

- [ ] **Step 6: Commit**

```bash
git add web/public/index.html web/tailwind.config.js web/src/index.css
git commit -m "feat(web): luxury type + theme + global motion foundation (phase 6)"
```

---

## Task 2: Loading primitives — Spinner, Skeleton, ProgressBar

**Files:**
- Create: `web/src/components/ui/Spinner.js`
- Create: `web/src/components/ui/Skeleton.js`
- Create: `web/src/components/ui/ProgressBar.js`
- Test: `web/src/components/ui/__tests__/Skeleton.test.js`

**Interfaces:**
- Produces:
  - `Spinner({ size = 40, className })` → gold ring `<span role="status" aria-label="Loading">`.
  - `Skeleton({ className })` → `<div class="skel ...">` (caller sets size via className).
  - `ProgressBar({ className })` → indeterminate gold bar.

- [ ] **Step 1: Write the failing test** — `web/src/components/ui/__tests__/Skeleton.test.js`:

```jsx
import { render, screen } from "@testing-library/react";
import Skeleton from "../Skeleton";
import Spinner from "../Spinner";

test("Skeleton renders a shimmer block with passed className", () => {
  const { container } = render(<Skeleton className="h-4 w-20" />);
  const el = container.firstChild;
  expect(el).toHaveClass("skel", "h-4", "w-20");
});

test("Spinner exposes an accessible loading role", () => {
  render(<Spinner />);
  expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm test -- --watchAll=false src/components/ui/__tests__/Skeleton.test.js`
Expected: FAIL — "Cannot find module '../Skeleton'".

- [ ] **Step 3: Implement the three primitives**

`web/src/components/ui/Spinner.js`:
```jsx
export default function Spinner({ size = 40, className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-2 border-luxury-gold/20 border-t-luxury-gold2 animate-spin-gold ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
```

`web/src/components/ui/Skeleton.js`:
```jsx
export default function Skeleton({ className = "" }) {
  return <div className={`skel rounded-xl ${className}`} />;
}
```

`web/src/components/ui/ProgressBar.js`:
```jsx
export default function ProgressBar({ className = "" }) {
  return (
    <div className={`h-[3px] rounded-full bg-white/5 overflow-hidden ${className}`}>
      <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-luxury-gold to-luxury-gold2 animate-bar" />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm test -- --watchAll=false src/components/ui/__tests__/Skeleton.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/Spinner.js web/src/components/ui/Skeleton.js web/src/components/ui/ProgressBar.js web/src/components/ui/__tests__/Skeleton.test.js
git commit -m "feat(web): loading primitives — spinner, skeleton, progress bar"
```

---

## Task 3: Button primitive (signature CTA + loading)

**Files:**
- Create: `web/src/components/ui/Button.js`
- Test: `web/src/components/ui/__tests__/Button.test.js`

**Interfaces:**
- Consumes: `Spinner` from Task 2.
- Produces: `Button({ variant = "primary", loading = false, children, className, ...props })`.
  - `variant="primary"` → `.btn-lux` pill; `variant="ghost"` → gold-outline pill.
  - `loading` → renders `<Spinner size={16}/>` before children and sets `disabled`.

- [ ] **Step 1: Write the failing test** — `web/src/components/ui/__tests__/Button.test.js`:

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../Button";

test("primary button renders children and is clickable", () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Add to Cart</Button>);
  const btn = screen.getByRole("button", { name: /add to cart/i });
  expect(btn).toHaveClass("btn-lux");
  fireEvent.click(btn);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("loading button shows a spinner and is disabled", () => {
  render(<Button loading>Add to Cart</Button>);
  expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
  expect(screen.getByRole("button")).toBeDisabled();
});

test("ghost variant does not use btn-lux", () => {
  render(<Button variant="ghost">View in AR</Button>);
  expect(screen.getByRole("button", { name: /view in ar/i })).not.toHaveClass("btn-lux");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm test -- --watchAll=false src/components/ui/__tests__/Button.test.js`
Expected: FAIL — "Cannot find module '../Button'".

- [ ] **Step 3: Implement `web/src/components/ui/Button.js`**

```jsx
import Spinner from "./Spinner";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium uppercase tracking-[0.3em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold/60 disabled:opacity-70 disabled:cursor-progress";

export default function Button({
  variant = "primary",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}) {
  const variantCls =
    variant === "primary"
      ? "btn-lux px-8 py-3"
      : "px-8 py-3 text-luxury-champagne border border-luxury-gold/40 hover:border-luxury-gold hover:bg-luxury-gold/10";
  return (
    <button
      className={`${BASE} ${variantCls} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={16} className="border-luxury-bg/40 border-t-luxury-bg" />}
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm test -- --watchAll=false src/components/ui/__tests__/Button.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/Button.js web/src/components/ui/__tests__/Button.test.js
git commit -m "feat(web): Button primitive — signature CTA + loading state"
```

---

## Task 4: Chip primitive (persistent selected indicator) + remaining primitives

**Files:**
- Create: `web/src/components/ui/Chip.js`
- Create: `web/src/components/ui/Card.js`
- Create: `web/src/components/ui/Input.js`
- Create: `web/src/components/ui/Badge.js`
- Create: `web/src/components/ui/Divider.js`
- Create: `web/src/components/ui/SectionLabel.js`
- Create: `web/src/components/ui/index.js`
- Test: `web/src/components/ui/__tests__/Chip.test.js`

**Interfaces:**
- Produces:
  - `Chip({ active = false, children, onClick, className })` — `aria-pressed={active}`; when active uses gold-tinted glass + gold border + champagne text + a gold dot marker; otherwise outlined.
  - `Card({ children, className })` → glass surface.
  - `Input({ icon, className, ...props })` → glass input, optional left icon node.
  - `Badge({ children, className })` → small uppercase tag.
  - `Divider({ className })` → `.gold-rule`.
  - `SectionLabel({ children, className })` → wide-tracked uppercase gold label.
  - `index.js` re-exports all primitives (incl. Task 2/3).

- [ ] **Step 1: Write the failing test** — `web/src/components/ui/__tests__/Chip.test.js`:

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import Chip from "../Chip";

test("inactive chip has aria-pressed false and no gold marker", () => {
  render(<Chip onClick={() => {}}>Oud</Chip>);
  const chip = screen.getByRole("button", { name: /oud/i });
  expect(chip).toHaveAttribute("aria-pressed", "false");
  expect(chip.querySelector("[data-active-dot]")).toBeNull();
});

test("active chip persists a selected indicator", () => {
  render(<Chip active onClick={() => {}}>Oud</Chip>);
  const chip = screen.getByRole("button", { name: /oud/i });
  expect(chip).toHaveAttribute("aria-pressed", "true");
  expect(chip.className).toMatch(/luxury-gold/);
  expect(chip.querySelector("[data-active-dot]")).not.toBeNull();
});

test("chip fires onClick", () => {
  const onClick = jest.fn();
  render(<Chip onClick={onClick}>Oud</Chip>);
  fireEvent.click(screen.getByRole("button", { name: /oud/i }));
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm test -- --watchAll=false src/components/ui/__tests__/Chip.test.js`
Expected: FAIL — "Cannot find module '../Chip'".

- [ ] **Step 3: Implement the primitives**

`web/src/components/ui/Chip.js`:
```jsx
export default function Chip({ active = false, children, onClick, className = "" }) {
  const cls = active
    ? "border-luxury-gold/70 bg-luxury-gold/15 text-luxury-champagne"
    : "border-white/15 text-white/65 hover:border-luxury-gold/50 hover:text-white";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full border text-xs uppercase tracking-[0.3em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold/60 ${cls} ${className}`}
    >
      {active && <span data-active-dot className="w-1.5 h-1.5 rounded-full bg-luxury-gold2" />}
      {children}
    </button>
  );
}
```

`web/src/components/ui/Card.js`:
```jsx
export default function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-luxury-gold/15 bg-white/[0.04] backdrop-blur-md shadow-gold ${className}`}
    >
      {children}
    </div>
  );
}
```

`web/src/components/ui/Input.js`:
```jsx
export default function Input({ icon = null, className = "", ...props }) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-luxury-gold2/70">{icon}</span>
      )}
      <input
        className={`w-full h-14 ${icon ? "pl-14" : "pl-5"} pr-5 text-base text-white bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 outline-none focus:border-luxury-gold/60 focus:bg-white/10 transition placeholder:text-white/35 ${className}`}
        {...props}
      />
    </div>
  );
}
```

`web/src/components/ui/Badge.js`:
```jsx
export default function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.3em] border border-luxury-gold/30 text-luxury-gold2 ${className}`}
    >
      {children}
    </span>
  );
}
```

`web/src/components/ui/Divider.js`:
```jsx
export default function Divider({ className = "" }) {
  return <div className={`gold-rule ${className}`} />;
}
```

`web/src/components/ui/SectionLabel.js`:
```jsx
export default function SectionLabel({ children, className = "" }) {
  return (
    <p className={`uppercase tracking-[0.3em] text-[11px] text-luxury-gold/80 ${className}`}>
      {children}
    </p>
  );
}
```

`web/src/components/ui/index.js`:
```jsx
export { default as Spinner } from "./Spinner";
export { default as Skeleton } from "./Skeleton";
export { default as ProgressBar } from "./ProgressBar";
export { default as Button } from "./Button";
export { default as Chip } from "./Chip";
export { default as Card } from "./Card";
export { default as Input } from "./Input";
export { default as Badge } from "./Badge";
export { default as Divider } from "./Divider";
export { default as SectionLabel } from "./SectionLabel";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm test -- --watchAll=false src/components/ui/__tests__/Chip.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd web && npm test -- --watchAll=false`
Expected: all suites pass (the new ui tests + existing App.test.js).

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ui/
git commit -m "feat(web): Chip (persistent selected state) + Card/Input/Badge/Divider/SectionLabel + barrel"
```

---

## Task 5: Home (MainPage) restyle

**Files:**
- Modify: `web/src/pages/MainPage.js`

**Reference:** `docs/superpowers/mockups/phase-6/home.html`.

**Interfaces:**
- Consumes: `Card`, `Chip`, `Input`, `Badge`, `Skeleton`, `Button`, `SectionLabel` from `components/ui`.
- Keep ALL existing state, fetch (`http.get("products/")`, `http.get("me/")`), filter logic, and `Link`/route targets unchanged.

- [ ] **Step 1: Background + container** — replace the root `bg-gradient-to-b from-[#0a1628] via-[#0c1a3a] to-[#0e1f4a]` with the luxury base: `bg-luxury-bg` plus the existing gold radial glow (`bg-gold-radial`) as a fixed overlay. Keep the `max-w-screen-2xl` container.

- [ ] **Step 2: Header** — keep the welcome label + username + avatar. Wrap the label in `<SectionLabel>Welcome back</SectionLabel>`; username heading → `font-serif` (now Playfair) `text-luxury-champagne` (drop the yellow-400). Avatar ring → `ring-luxury-gold/40`.

- [ ] **Step 3: Search** — replace the hand-rolled input block with `<Input icon={<SearchIcon/>} placeholder="Search fragrance, note, or mood…" value={searchTerm} onChange=...>`. Keep `searchTerm` state wiring identical. (Reuse the existing `IoSearchOutline` as the icon node.)

- [ ] **Step 4: Hero slider** — keep the Swiper config and `heroProducts.map`. Restyle each slide: name → `font-serif` Playfair, the small rule stays gold, category label uses `text-luxury-gold/90 tracking-[0.3em]`. Replace `HeroSkeleton`'s `bg-white/10` blocks with `<Skeleton>`.

- [ ] **Step 5: Filter pills → Chips with persistent state** — replace each filter `<button>` with `<Chip active={...} onClick={...}>`:
  - "ALL": `<Chip active={!hasAnyFilter} onClick={clearAll}>All</Chip>`.
  - categories: `<Chip key={cat} active={selectedCategories.includes(cat)} onClick={() => toggleCategory(cat)}>{cat}</Chip>` — **remove the cyan `bg-cyan-400/20 border-cyan-300` active classes** (Chip supplies the gold active state).
  - gender: same pattern, **remove the pink classes**.
  - Keep the "More" `<details>` overflow; restyle its panel to `bg-luxury-panel2/95 border-luxury-gold/15`; the items become `<Chip>` too.
  Keep `PillsSkeleton` but swap its blocks to `<Skeleton className="h-10 w-24 rounded-full" />`.

- [ ] **Step 6: Product grid** — wrap each card body in `<Card className="card p-4 sm:p-5">` (add a `.card` hover-lift class in `index.css` `@layer components` if not present: `.card{transition:transform .45s cubic-bezier(.2,.7,.2,1),border-color .4s,box-shadow .4s} .card:hover{transform:translateY(-6px);border-color:rgba(212,175,55,.55)}`). Image keeps the existing `<img>` and `object-cover group-hover:scale-105`. Target badge → `<Badge>`. Name → `font-serif` Playfair. Category → `text-luxury-gold/90`. Replace `GridSkeleton` blocks with `<Skeleton>`.

- [ ] **Step 7: Verify build**

Run: `cd web && npm run build`
Expected: Compiled successfully.

- [ ] **Step 8: Manual visual verification (documented)** — `npm start`, open Home. Verify against `home.html`: luxury background; Playfair headings; gold-only filter chips; **selecting a category/gender keeps a persistent gold active state with the dot**; hover lifts cards; skeletons shimmer gold on first load (throttle network in devtools). Confirm products/filter still work (data unchanged). Record steps + result in `progress.md`.

- [ ] **Step 9: Commit**

```bash
git add web/src/pages/MainPage.js web/src/index.css
git commit -m "style(web): Home redesign — luxe tokens, gold filter chips, skeletons"
```

---

## Task 6: Product (ProductPage) restyle

**Files:**
- Modify: `web/src/pages/ProductPage.js`

**Reference:** `docs/superpowers/mockups/phase-6/product.html`.

**Interfaces:**
- Consumes: `Card`, `Button`, `Badge`, `Divider`, `SectionLabel`, `Skeleton` from `components/ui`.
- Keep gallery state, add-to-cart handler, AR navigation, reviews fetch, and all routes unchanged.

- [ ] **Step 1: Layout shell** — page background `bg-luxury-bg` + gold glow overlay; 2-col grid (gallery / details) on `lg`, stacked on mobile, matching `product.html`.
- [ ] **Step 2: Gallery** — main image in a `<Card>`/glass stage; thumbnails row with active thumb `border-luxury-gold/40`. Keep existing image/gallery state. The "View in AR" control becomes `<Button variant="ghost">` (or the in-stage pill from the mockup) — keep its existing onClick/navigation to the AR route.
- [ ] **Step 3: Details** — `<Badge>` for target; `font-serif` Playfair name; gold stars row (reuse existing rating value); description in `font-cormorant text-luxury-champagne/80`; `<Divider/>`; price in `font-serif`; quantity stepper restyled (gold hover).
- [ ] **Step 4: Add to Cart** — `<Button>` (primary, btn-lux). Wire its existing add-to-cart handler; while the request is in flight set `loading` on the button (use the existing submitting state, or add a local `adding` boolean around the existing async call — no API change).
- [ ] **Step 5: Composition + tags** — scent notes in a `<Card>` (Top/Heart/Base rows like the mockup, mapped from the existing notes/description fields actually present — do NOT invent fields; if structured notes aren't in the API, render the existing `tags` and description as the mockup's tag row). Tags → outlined pills.
- [ ] **Step 6: Reviews** — heading `font-serif` + `<Divider/>`; each review in a `<Card>` with gold stars. Keep the reviews data/fetch unchanged.
- [ ] **Step 7: Verify build** — `cd web && npm run build` → Compiled successfully.
- [ ] **Step 8: Manual visual verification (documented)** — open a product page; verify gallery, AR button still navigates, add-to-cart shows the loading spinner then succeeds, notes/tags/reviews render, matches `product.html`. Record in `progress.md`.
- [ ] **Step 9: Commit**

```bash
git add web/src/pages/ProductPage.js
git commit -m "style(web): Product redesign — gallery, AR entry, notes/tags, reviews"
```

---

## Task 7: Shop (ShopPage) restyle

**Files:**
- Modify: `web/src/pages/ShopPage.js`

**Interfaces:** Consumes `Card`, `Chip`, `Input`, `Badge`, `Skeleton`. Keep listing fetch, filter/sort state, and routes unchanged.

- [ ] **Step 1:** Apply the luxury background + container.
- [ ] **Step 2:** Restyle the product grid using `<Card>` + `<Badge>` + Playfair names + gold category (reuse the Home card recipe from Task 5 Step 6).
- [ ] **Step 3: Filters/sort → `<Chip>`** with persistent gold active state; **remove any cyan/pink/non-gold accents**. If there is a sort `<select>`, restyle to a glass control (gold focus border) — keep its options/handler unchanged.
- [ ] **Step 4:** Replace loading blocks with `<Skeleton>`.
- [ ] **Step 5: Verify build** — `cd web && npm run build` → Compiled successfully.
- [ ] **Step 6: Manual visual verification (documented)** — grid, filtering, sorting still work; selected filters/sort keep a persistent gold indicator. Record in `progress.md`.
- [ ] **Step 7: Commit**

```bash
git add web/src/pages/ShopPage.js
git commit -m "style(web): Shop redesign — grid, gold filters/sort with persistent state"
```

---

## Task 8: Quiz (QuizPage) restyle

**Files:**
- Modify: `web/src/pages/QuizPage.js`

**Interfaces:** Consumes `Card`, `Button`, `Chip`, `ProgressBar`, `SectionLabel`. Keep quiz state machine, answer scoping, submission, and result routing unchanged.

- [ ] **Step 1:** Luxury background; question card in `<Card>` with Playfair question text.
- [ ] **Step 2: Answer options** — restyle as selectable `<Chip>` or option cards with the **persistent gold selected state** (the user's selected answer stays visibly marked). Keep the existing selection state/handler.
- [ ] **Step 3:** Step progress uses `<ProgressBar>` or a gold step indicator; "Next/Submit" → `<Button>` with `loading` during submit.
- [ ] **Step 4:** Result screen — recommended products as `<Card>` tiles (reuse card recipe).
- [ ] **Step 5: Verify build** — Compiled successfully.
- [ ] **Step 6: Manual visual verification (documented)** — full quiz run: selecting an answer shows persistent gold indicator; progress advances; result renders. Record in `progress.md`.
- [ ] **Step 7: Commit**

```bash
git add web/src/pages/QuizPage.js
git commit -m "style(web): Quiz redesign — option cards with persistent selected state"
```

---

## Task 9: Cart + Checkout restyle

**Files:**
- Modify: `web/src/pages/CartPage.js`
- Modify: `web/src/pages/CheckoutPage.js`

**Interfaces:** Consumes `Card`, `Button`, `Input`, `Divider`, `Badge`, `Spinner`. Keep cart math, line-item updates, checkout submission, and order routing unchanged (Phase 3 atomic checkout logic is server-side — untouched).

- [ ] **Step 1: Cart** — items in `<Card>` rows (Playfair name, gold price); quantity steppers gold-hover; summary panel in a `<Card>` with `<Divider/>`; "Checkout" → `<Button>`.
- [ ] **Step 2: Checkout** — form fields → `<Input>` with visible labels (keep field names/validation/handlers); order summary in `<Card>`; "Place Order" → `<Button>` with `loading` during submit (use existing submitting state).
- [ ] **Step 3: Verify build** — Compiled successfully.
- [ ] **Step 4: Manual visual verification (documented)** — add to cart → cart → checkout → place a test order end to end; confirm totals and submission unchanged, loading state shows on submit. Record in `progress.md`.
- [ ] **Step 5: Commit**

```bash
git add web/src/pages/CartPage.js web/src/pages/CheckoutPage.js
git commit -m "style(web): Cart + Checkout redesign (visual only)"
```

---

## Task 10: Account + Orders restyle

**Files:**
- Modify: `web/src/pages/AccountPage.js`
- Modify: `web/src/pages/OrdersPage.js`

**Interfaces:** Consumes `Card`, `Button`, `Badge`, `Divider`, `SectionLabel`, `Skeleton`. Keep profile/orders fetch and actions unchanged.

- [ ] **Step 1: Account** — profile header (avatar ring gold, Playfair name); settings/links as `<Card>` rows; actions → `<Button>` (logout uses `variant="ghost"` and stays visually separated).
- [ ] **Step 2: Orders** — each order in a `<Card>`; status as `<Badge>`; gold dividers; loading via `<Skeleton>`.
- [ ] **Step 3: Verify build** — Compiled successfully.
- [ ] **Step 4: Manual visual verification (documented)** — account renders, orders list renders, actions work. Record in `progress.md`.
- [ ] **Step 5: Commit**

```bash
git add web/src/pages/AccountPage.js web/src/pages/OrdersPage.js
git commit -m "style(web): Account + Orders redesign (visual only)"
```

---

## Task 11: Auth pages restyle (Login + Signup)

**Files:**
- Modify: `web/src/pages/LoginPage.js`
- Modify: `web/src/pages/SignupPage.js`

**Interfaces:** Consumes `Card`, `Button`, `Input`, `Divider`, `SectionLabel`. Keep JWT login, Google login (`@react-oauth/google`), signup submission, and routing unchanged.

- [ ] **Step 1:** Centered auth `<Card>` on the luxury background; brand wordmark in Playfair; fields → `<Input>` (keep names/validation); submit → `<Button>` with `loading`.
- [ ] **Step 2:** Keep the Google login button; frame it under a `<Divider/>` with a "or continue with" label. Do not change its onSuccess handler.
- [ ] **Step 3: Verify build** — Compiled successfully.
- [ ] **Step 4: Manual visual verification (documented)** — email login + Google login still work from the restyled pages (test against the live or local backend). Record in `progress.md`.
- [ ] **Step 5: Commit**

```bash
git add web/src/pages/LoginPage.js web/src/pages/SignupPage.js
git commit -m "style(web): Login + Signup redesign (visual only)"
```

---

## Task 12: Admin shell restyle (dashboard + tables)

**Files:**
- Modify: `web/src/pages/admin/AdminDashboardPage.js`
- Modify: `web/src/pages/admin/AdminProductsPage.js`
- Modify: `web/src/pages/admin/AdminOrdersPage.js`

**Interfaces:** Consumes `Card`, `Button`, `Badge`, `Divider`, `SectionLabel`, `Skeleton`. Keep all admin data fetch, table data, CRUD actions, and routes unchanged. This establishes the admin look; other admin pages inherit the tokens but are not pixel-polished this phase.

- [ ] **Step 1: Dashboard** — luxury background; stat tiles in `<Card>` with Playfair numbers + gold labels; section headers with `<SectionLabel>` + `<Divider/>`.
- [ ] **Step 2: Tables (Products, Orders)** — wrap tables in `<Card>`; header row uppercase tracked labels; row hover `bg-white/[0.03]`; status → `<Badge>`; primary actions → `<Button>` (destructive actions visually separated, danger styling retained). Keep table data/sort/pagination logic unchanged.
- [ ] **Step 3: Verify build** — Compiled successfully.
- [ ] **Step 4: Manual visual verification (documented)** — admin dashboard + product/order tables render and actions (edit/delete/status) still work. Record in `progress.md`.
- [ ] **Step 5: Commit**

```bash
git add web/src/pages/admin/AdminDashboardPage.js web/src/pages/admin/AdminProductsPage.js web/src/pages/admin/AdminOrdersPage.js
git commit -m "style(web): admin shell redesign — dashboard + tables"
```

---

## Task 13: Cross-cutting QA, deploy preview, docs, review, merge + tag

**Files:**
- Modify: `web/src/index.css` (only if QA finds a shared fix)
- Modify: `context.md`, `progress.md`, `task_plan.md`

- [ ] **Step 1: Responsive sweep** — manually check Home, Product, Shop, Quiz, Cart/Checkout, Login at 375 / 768 / 1024 / 1440 px (devtools). No horizontal scroll; touch targets ≥ 44px. Record issues + fixes.
- [ ] **Step 2: Reduced-motion + contrast** — toggle OS "reduce motion": confirm the btn-lux sheen, panning, shimmer, and spinners stop. Spot-check text-on-glass contrast ≥ 4.5:1 (devtools). Fix any failures in `index.css`/components.
- [ ] **Step 3: Full test + build**

Run: `cd web && npm test -- --watchAll=false && npm run build`
Expected: all tests pass; build compiles.

- [ ] **Step 4: Deploy a preview to Firebase (optional, owner)** — `cd web && firebase deploy --only hosting` (the Phase 5 config) to review live, or use a Firebase preview channel `firebase hosting:channel:deploy phase6`.

- [ ] **Step 5: Docs** — update `context.md` (note the Phase 6 design system + `components/ui` primitives), append the manual-verification evidence to `progress.md`, mark Phase 6 in `task_plan.md`.

- [ ] **Step 6: Review** — `/code-review` and `/security-review` (the latter is light here — visual only, but confirm no inadvertent logic/route/API changes slipped in). Resolve findings.

- [ ] **Step 7: Owner approval → merge + tag**

```bash
git checkout main
git merge --no-ff phase-6-ui-redesign -m "merge: Phase 6 — luxury UI/UX redesign"
git tag -a phase-6-ui-redesign -m "Phase 6: dark-opulent luxury redesign across the core flow + admin shell"
git push origin main --follow-tags
```

---

## Self-Review

- **Spec coverage:** palette/type/surfaces/motion → Task 1–4; signature CTA → Task 3; loading system → Task 2; persistent chip selected state → Task 4 + applied Tasks 5/7/8; core-flow pages (Home/Shop/Product/Quiz/Cart/Checkout/Account/Orders/Login/Signup) → Tasks 5–11; admin shell → Task 12; responsive/reduced-motion/contrast + docs/merge → Task 13. No spec requirement is untasked.
- **Placeholder scan:** primitives + foundation carry full code and tests; page tasks give concrete recipes (exact files, primitives, tokens, and the mockup reference) with documented manual verification — the project's hybrid gate for UI. No "TBD/handle edge cases" steps.
- **Type consistency:** primitive prop names (`variant`, `loading`, `active`, `icon`) are defined in Tasks 2–4 and reused verbatim in Tasks 5–12; the `components/ui` barrel (`index.js`) is the single import source.
- **Constraint guard:** every page task explicitly states "keep fetch/state/routes/handlers unchanged"; Task 13 Step 6 re-verifies no logic slipped in.
