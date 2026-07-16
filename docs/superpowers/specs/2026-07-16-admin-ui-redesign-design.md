# Admin UI Redesign — Design Spec

- **Date:** 2026-07-16
- **Phase:** Extends Phase 6 (luxury UI/UX redesign) to the admin surface.
- **Requirement ref:** NFR — UI/branding consistency across the app. No new FR;
  applies the existing "Liquid Glass" design system to `/admin/*`. All admin FRs
  (product/order/user/review/payment/retailer/about/AR/quiz/scent-persona
  management) are unchanged.
- **Scope:** Visual-only. Every handler, endpoint, state field, and route is
  preserved. No new dependencies.
- **Rollback point:** branch `phase-7-admin-ui` off `main` (tag `phase-6-ui-redesign`).

---

## 1. Problem

The customer-facing app was rebuilt to the "Liquid Glass" luxury system in Phase 6.
The 14 admin management pages were left on the old look: raw `bg-[#070B14]` shells,
`bg-white/10` / `bg-white/20` inputs, flat `bg-luxury-gold` and `bg-red-600` buttons,
emoji status markers, native `<select>` controls, and three separately-authored
copies each of Toast and Confirm modals. A source scan counts **185 off-palette
utility occurrences across the 14 files**. Only `AdminDashboardPage` already carries
the new shell (sidebar + glass stat cards).

The redesign brings all 14 pages onto one shared admin design language derived from
the current storefront, with zero change to behaviour, data, or routes.

---

## 2. Design baseline (recorded from source)

The authoritative design system, extracted from `web/tailwind.config.js` and
`web/src/index.css`. The admin redesign consumes this vocabulary as-is; it does not
introduce new tokens.

### 2.1 Branding
Maison **GÉRAIN CHAN** — dark-opulent "Liquid Glass" luxury (Dior/Chanel restraint).
Center Playfair wordmark, `tracking-[0.3em]`, announcement bar on the storefront.
Admin dialect: same brand, but utilitarian — persistent sidebar + "Maison Admin"
wordmark instead of the marketing wordmark.

### 2.2 Tokens (`luxury.*`)
| token | value | role |
|-------|-------|------|
| bg | `#070B14` | page background |
| panel | `#0B1222` | card background |
| panel2 | `#0E1830` | hover / modal |
| line | `#1C2740` | hairline borders / dividers |
| gold | `#D4AF37` | primary accent |
| gold2 | `#F3D37A` | bright accent / links |
| champagne | `#F7E7CE` | warm high-contrast text |
| text | `#ECE7DD` | high-contrast body text |
| mut | `#A9B0BE` | muted secondary text |

**Gotcha (carry forward):** tailwindcss 3.0.0 silently does NOT emit the `/85`
opacity-modifier class for the custom `luxury` colors. Never use `text-luxury-*/85`;
use solid tokens (`text-luxury-gold2`, `text-luxury-champagne`) or `/80` / `/90`.

### 2.3 Type
- **Playfair Display** — headings (auto-applied to `h1`–`h6` via `@layer base`).
- **Cormorant Garamond** — italic taglines. *Not used in admin* (marketing-only).
- **Inter** — body / UI.
- `.label` — `letter-spacing: 0.34em`, used uppercase for eyebrows and table headers.

### 2.4 Component vocabulary (`index.css @layer components`)
`.glass` (blur + 1px gold-tint border) · `.btn-lux` (panning gold + hover sheen;
keyframes live in plain CSS, not Tailwind theme) · `.ghost` (gold outline) ·
`.card` (hover lift + gold border) · `.fld` (dark glass input, gold focus ring) ·
`.rule` / `.gold-rule` (gold hairline) · `.gold-text` (gold gradient clip) ·
`.skel` (gold shimmer skeleton) · `.glow` (page atmosphere radial).
All motion gated by `@media (prefers-reduced-motion: reduce)`.

### 2.5 Existing reusable UI
- `web/src/components/ui/Dropdown.js` — luxury custom dropdown (glass menu, gold
  hover, active `✓`, click-outside + Escape, `role="listbox"`). **Replaces every
  native `<select>` in admin.**
- `web/src/components/PageHeader.js` — `‹` guillemet back button in gold circle.
  Superseded by the shell top bar (below), which subsumes its role.

---

## 3. Page → archetype mapping

| Archetype | Pages |
|-----------|-------|
| **A. Table** | `AdminUsersPage`, `AdminReviewPage`, `AdminProductsPage`, `AdminPaymentsPage`, `AdminOrdersPage`, `AdminARManagement` |
| **B. Card-grid CRUD** | `AdminRetailersPage` |
| **C. Editor form** | `AddProductPage`, `EditProductPage`, `AdminProductFormPage`, `AdminScentPersonaPage`, `AdminAREditPage`, `AdminAboutPage` |
| **C-nested. Editor** | `AdminQuizManagement` (nested question/option editor on the same form template) |

Per-page confirmation of exact controls happens at implementation time; each page's
existing data fetch, mutations, and routes are read before its rewrite (Read Before
Writing, §4.2 of the harness).

---

## 4. Architecture

### 4.1 `AdminShell` (persistent layout)
A single layout component wrapping every admin route.

- **Sidebar** (`w-64`, `hidden lg:flex`): "Maison Admin" Playfair wordmark; nav list
  (the existing `NAV` array from `AdminDashboardPage`); active item =
  `bg-luxury-gold/12 text-luxury-champagne border-l-2 border-luxury-gold`.
- **Top bar:** breadcrumb `‹` back + Playfair page title (`title` prop) + a
  right-aligned **primary-action slot** (`actions` prop — e.g. "Add Product").
- **Content area:** `relative z-10` with the gold radial `.glow`.
- **Mobile:** sidebar collapses to a top drawer/hamburger (below `lg`); content is
  full-width. (Admin is desktop-first; mobile is functional, not decorative.)

**Structural change (the one non-visual change):** the sidebar becomes persistent via
a React-Router **layout route** around `/admin/*`, so it does not re-mount per page.
The dashboard's inline sidebar is lifted into `AdminShell`. This is the only routing
edit; page components lose their own `min-h-screen bg-[#070B14]` wrapper and
`PageHeader`, rendering their content inside the shell instead.

- Interface: `<AdminShell title={string} actions={ReactNode}>{children}</AdminShell>`,
  or as a layout route rendering `<Outlet/>` with title/actions supplied by each page
  (via a small context or per-page prop wrapper — decided in the plan).
- Depends on: `react-router-dom`, `AuthContext` (staff guard unchanged).

### 4.2 Shared primitives (new, under `web/src/components/admin/`)
Each replaces duplicated/divergent copies. All are presentational; they take data and
callbacks as props and hold no domain logic.

| Primitive | Replaces | Contract |
|-----------|----------|----------|
| `AdminToast` | 3 divergent Toast copies | `{message, type: "success"\|"error"\|"info", onClose}`; glass; gold success / red error; auto-dismiss. |
| `AdminConfirm` | `ConfirmDelete`, `Confirm`, `ConfirmModal` | `{open, title, message, confirmText, tone, onConfirm, onCancel}`; glass; destructive = red action. |
| `AdminModal` | ad-hoc `fixed inset-0 bg-black/60` blocks | `{open, title, onClose, children, size}`; glass panel, backdrop, Escape close. |
| `DataTable` | hand-rolled `<table>` blocks | `{columns, rows, renderRow, loading, empty, actions}`; `.label` mut headers, hairline rows, hover, `.skel` loading, empty state. |
| `StatusPill` | flat `bg-luxury-gold` status spans | `{status, kind: "order"\|"payment"}`; semantic color map (see §4.3). |
| `Toolbar` | ad-hoc search/sort rows | search `.fld` + filter `Dropdown`(s) + right-aligned primary action slot. |
| `Field` set | inline `bg-white/10` inputs | thin wrappers over `.fld` + `.label`; text / textarea / file / time / checkbox-as-gold-toggle; selects use existing `Dropdown`. |

Button conventions (no new component needed): primary = `btn-lux`, secondary =
`.ghost`, destructive = red-outline ghost (`border-red-500/50 text-red-300 hover:bg-red-500/10`).

### 4.3 `StatusPill` semantic map (fixes dead logic)
Current code maps every order status and most payment states to the same
`bg-luxury-gold`, and payment status colors are all gold variants — the pills carry no
information. New map (real contrast, on glass):

- **In-progress / pending** (`TO_PAY`, `TO_SHIP`, `TO_RECEIVE`, `TO_RATE`, `PENDING`):
  gold outline pill, `text-luxury-gold2`.
- **Positive / done** (`COMPLETED`, `SUCCESS`): champagne-filled pill, dark text.
- **Neutral** (`COD`, `UNPAID`, unknown): mut outline, `text-luxury-mut`.
- **Negative** (`CANCELLED`, `FAILED`): red outline, `text-red-300`.

The exact status→bucket table is finalized against the enums in
`server/shop/models.py` during implementation (no guessing).

### 4.4 Data flow (unchanged)
Every page keeps its current `http` calls, state shape, and mutation handlers. The
redesign only swaps the presentational layer. No serializer, endpoint, or model
change. No new client state beyond local UI (modal open, toolbar search) that already
exists.

---

## 5. Non-goals (YAGNI)

- No new admin features, columns, filters, or bulk actions beyond what each page has.
- No pagination/virtualization redesign unless a page already implements it.
- No backend, serializer, or schema change.
- No new dependency; reuse `framer-motion`, `react-icons`, existing `Dropdown`.
- Cormorant italic display type is intentionally excluded from admin.

---

## 6. Testing (hybrid gate)

- **Automated:** the primitives (`DataTable` empty/loading, `StatusPill` mapping,
  `AdminConfirm` callbacks) get React Testing Library tests. Backend is untouched, so
  no new pytest.
- **Manual (documented in `progress.md`):** each redesigned page is driven through
  its real flows against live data — list loads, view/detail modal, create, edit,
  delete-with-confirm, toast on success/error, filter/search, sticky-save. Observed
  results recorded. `CI=false npm run build` must pass (warnings ok, no errors).
- Visual verification via Playwright screenshots of each page (auth-gated pages viewed
  with a dummy `localStorage.access` token locally — no DB writes), compared to the
  `/ui-ux-pro-max` mockups.

---

## 7. Build sequence (for the plan)

1. `AdminShell` + layout route + lift dashboard sidebar. Verify all admin routes still
   resolve and the staff guard holds.
2. Shared primitives (`AdminToast`, `AdminConfirm`, `AdminModal`, `DataTable`,
   `StatusPill`, `Toolbar`, `Field` set) + their unit tests.
3. Archetype A (6 table pages), one commit per page.
4. Archetype B (Retailers).
5. Archetype C (7 editor pages), one commit per page; Quiz Management last (nested).
6. Remove now-dead per-page Toast/Confirm/PageHeader usages; confirm 0 off-palette
   utilities remain (`bg-white/10`, `bg-[#…]`, flat `bg-red-600`, native `<select>`).
7. Phase review (`/code-review`; `/security-review` not required — no auth/storage/CORS
   change), merge, tag `phase-7-admin-ui`.

---

## 8. Open items resolved in this design

- **QA scope:** source-level capture (chosen 2026-07-16); no live browser QA pass.
- **Uniformity:** reusable shell + all 14 pages (chosen 2026-07-16).
- **Visuals:** `/ui-ux-pro-max` renders this spec before the implementation plan is
  written (per owner's sequencing: baseline → spec → visual → plan).
