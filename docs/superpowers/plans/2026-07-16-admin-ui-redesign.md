# Admin UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all 14 admin management pages onto the storefront's "Liquid Glass" luxury design system via a persistent admin shell and a shared primitive library, changing appearance only.

**Architecture:** Add an `AdminShell` layout route (sidebar + sticky top bar + `<Outlet/>`) around `/admin/*`, with page title/actions flowing up through a small `AdminChromeContext`. Build seven presentational primitives (`AdminToast`, `AdminConfirm`, `AdminModal`, `DataTable`, `StatusPill`, `Toolbar`, `AdminField` set) that replace the duplicated per-page Toast/Confirm/table/input markup. Then migrate each page onto these primitives, preserving every handler, endpoint, state field, and route.

**Tech Stack:** React 19 (CRA / react-scripts 5), react-router-dom v6, Tailwind 3.0.0 (custom `luxury` tokens), framer-motion, react-icons, existing `components/ui/Dropdown`. Tests: Jest + React Testing Library (`react-scripts test`).

## Global Constraints

- **Visual-only.** No serializer, endpoint, model, or route-path change. Every existing `http` call, state field, and handler is preserved verbatim.
- **No new dependencies.** Reuse framer-motion, react-icons, and `components/ui/Dropdown`.
- **Tailwind /85 gotcha.** Never use `text-luxury-*/85` (tailwindcss 3.0.0 emits no rule for it). Use solid tokens (`text-luxury-gold2`, `text-luxury-champagne`) or `/80` / `/90`.
- **Tokens (verbatim):** bg `#070B14`, panel `#0B1222`, panel2 `#0E1830`, line `#1C2740`, gold `#D4AF37`, gold2 `#F3D37A`, champagne `#F7E7CE`, text `#ECE7DD`, mut `#A9B0BE`. Component classes from `web/src/index.css`: `.glass .btn-lux .ghost .card .fld .rule .gold-rule .gold-text .label .skel .glow`.
- **Fonts:** Playfair Display (headings, auto via `@layer base`), Inter (body/UI). No Cormorant in admin.
- **z-index scale:** use `z-10 / z-20 / z-40` only. Never `z-[9999]`.
- **Motion** gated by `prefers-reduced-motion` (already global in `index.css`).
- **No emoji as structural icons.** Use react-icons (io5). The classical `‹` back guillemet and `✦` accent are typographic marks, allowed.
- **Branch:** `phase-7-admin-ui` (already created off `main`). One commit per task, Conventional Commits, no attribution lines.
- **Build gate:** `cd web && CI=false npm run build` passes (warnings ok, no errors) before any page task is marked done.
- **Test command:** `cd web && CI=true npx react-scripts test --watchAll=false <path>`.

**Reference spec:** `docs/superpowers/specs/2026-07-16-admin-ui-redesign-design.md`.
**Reference mockup:** `docs/superpowers/mockups/phase-7-admin/admin.html`.

---

## File Structure

New files (all under `web/src/`):

- `context/AdminChromeContext.js` — holds `{title, actions, backTo}`; exports `AdminChromeProvider`, `useAdminChrome(config)` (setter hook for pages), `useAdminChromeState()` (reader for the shell).
- `components/admin/AdminShell.js` — layout: sidebar + sticky top bar + `<main><Outlet/></main>` + glow.
- `components/admin/AdminToast.js` — one canonical toast.
- `components/admin/AdminConfirm.js` — one canonical confirm dialog.
- `components/admin/AdminModal.js` — glass modal shell.
- `components/admin/StatusPill.js` — semantic status pill.
- `components/admin/DataTable.js` — glass table wrapper (header + loading + empty).
- `components/admin/Toolbar.js` — search + filters + action bar.
- `components/admin/fields.js` — `AdminField` wrapper + `adminInput`/`adminTextarea` class strings + `AdminToggle`.
- `components/admin/index.js` — barrel export for the above.
- Tests colocated under `components/admin/__tests__/`.

Modified: `web/src/App.js` (nest admin routes under the shell), and each of the 14 admin page files.

---

## Task 1: AdminChromeContext

**Files:**
- Create: `web/src/context/AdminChromeContext.js`
- Test: `web/src/components/admin/__tests__/AdminChromeContext.test.js`

**Interfaces:**
- Produces:
  - `AdminChromeProvider({children})` — React provider holding chrome state.
  - `useAdminChrome({ title, actions, backTo })` — hook pages call once; sets chrome via `useLayoutEffect` (deps on the three values). `actions` is a ReactNode or null; `backTo` is a path string or -1 (default `-1`).
  - `useAdminChromeState()` — returns `{ title, actions, backTo }` for the shell.

- [ ] **Step 1: Write the failing test**

```jsx
// web/src/components/admin/__tests__/AdminChromeContext.test.js
import { render, screen } from "@testing-library/react";
import {
  AdminChromeProvider,
  useAdminChrome,
  useAdminChromeState,
} from "../../../context/AdminChromeContext";

function Reader() {
  const { title } = useAdminChromeState();
  return <div data-testid="title">{title}</div>;
}
function Setter() {
  useAdminChrome({ title: "Products", actions: null, backTo: "/admin" });
  return null;
}

test("page sets chrome title and shell reads it", () => {
  render(
    <AdminChromeProvider>
      <Reader />
      <Setter />
    </AdminChromeProvider>
  );
  expect(screen.getByTestId("title").textContent).toBe("Products");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/AdminChromeContext.test.js`
Expected: FAIL — cannot resolve `../../../context/AdminChromeContext`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// web/src/context/AdminChromeContext.js
import React, { createContext, useContext, useLayoutEffect, useState } from "react";

const ChromeStateContext = createContext({ title: "", actions: null, backTo: -1 });
const ChromeSetContext = createContext(() => {});

export function AdminChromeProvider({ children }) {
  const [chrome, setChrome] = useState({ title: "", actions: null, backTo: -1 });
  return (
    <ChromeSetContext.Provider value={setChrome}>
      <ChromeStateContext.Provider value={chrome}>
        {children}
      </ChromeStateContext.Provider>
    </ChromeSetContext.Provider>
  );
}

export function useAdminChromeState() {
  return useContext(ChromeStateContext);
}

// Pages call this once. actions may be a node; backTo defaults to -1 (history back).
export function useAdminChrome({ title, actions = null, backTo = -1 }) {
  const setChrome = useContext(ChromeSetContext);
  useLayoutEffect(() => {
    setChrome({ title, actions, backTo });
  }, [setChrome, title, actions, backTo]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/AdminChromeContext.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/context/AdminChromeContext.js web/src/components/admin/__tests__/AdminChromeContext.test.js
git commit -m "feat(admin): admin chrome context for shell title/actions"
```

---

## Task 2: AdminShell + routing

**Files:**
- Create: `web/src/components/admin/AdminShell.js`
- Modify: `web/src/App.js:112-139` (admin route block) and imports at `:40-53`
- Test: manual (routing + visual), no unit test — verified via build + browser.

**Interfaces:**
- Consumes: `AdminChromeProvider`, `useAdminChromeState` (Task 1); `react-router-dom` `Outlet`, `Link`, `useLocation`, `useNavigate`.
- Produces: `AdminShell()` default export — renders sidebar (`NAV` array), sticky top bar (back button, title, actions slot), and `<main><Outlet/></main>`. Wraps its subtree in `AdminChromeProvider`.

- [ ] **Step 1: Create the shell**

```jsx
// web/src/components/admin/AdminShell.js
import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AdminChromeProvider,
  useAdminChromeState,
} from "../../context/AdminChromeContext";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/ar-management", label: "AR Experiences" },
  { to: "/admin/scent-personas", label: "Scent Personas" },
  { to: "/admin/quiz-management", label: "Quizzes" },
  { to: "/admin/retailers", label: "Retailers" },
  { to: "/admin/about", label: "About" },
];

function TopBar() {
  const { title, actions, backTo } = useAdminChromeState();
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-20 backdrop-blur-xl bg-luxury-bg/70 border-b border-luxury-gold/15">
      <div className="px-6 sm:px-8 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => (backTo === -1 ? navigate(-1) : navigate(backTo))}
            className="ghost w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-lg font-serif"
            aria-label="Back"
          >
            ‹
          </button>
          <h1 className="font-serif text-2xl text-white truncate">{title}</h1>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

export default function AdminShell() {
  const location = useLocation();
  return (
    <AdminChromeProvider>
      <div className="relative flex min-h-[80vh]">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ background: "radial-gradient(50% 30% at 82% 0%,rgba(212,175,55,0.10),transparent 60%)" }}
        />
        <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 p-6 shrink-0 relative z-10">
          <p className="font-serif text-lg tracking-[0.25em] text-white mb-1">Maison</p>
          <p className="label uppercase text-[11px] text-luxury-gold/80 mb-9">Admin</p>
          <p className="label uppercase text-[10px] text-luxury-mut mb-3 px-3">Manage</p>
          <nav className="space-y-1 text-sm">
            {NAV.map((n) => {
              const active = location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`block px-3 py-2.5 rounded-r-lg border-l-2 transition ${
                    active
                      ? "bg-luxury-gold/12 text-luxury-champagne border-luxury-gold"
                      : "text-luxury-mut border-transparent hover:text-white"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 relative z-10 min-w-0">
          <TopBar />
          <div className="px-6 sm:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </AdminChromeProvider>
  );
}
```

- [ ] **Step 2: Nest the admin routes under the shell in `App.js`**

Add to the admin imports (`web/src/App.js:40`): `const AdminShell = () => import(...)` is not needed — import eagerly at top:

```jsx
import AdminShell from "./components/admin/AdminShell";
```

Replace the admin route block (`web/src/App.js:112-139`) with a nested layout route. Paths become relative (drop the leading `admin/`):

```jsx
            {/* ─── Admin-only Pages (shared shell) ─── */}
            <Route
              path="admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="products/new" element={<AdminProductFormPage />} />
              <Route path="products/:id/edit" element={<AdminProductFormPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="quiz-management" element={<AdminQuizManagement />} />
              <Route path="scent-personas" element={<AdminScentPersonaPage />} />
              <Route path="ar-management" element={<AdminARManagement />} />
              <Route path="ar-management/new" element={<AdminAREditPage />} />
              <Route path="ar-management/:id/edit" element={<AdminAREditPage />} />
              <Route path="reviews" element={<AdminReviewPage />} />
              <Route path="about" element={<AdminAboutPage />} />
              <Route path="retailers" element={<AdminRetailersPage />} />
            </Route>
```

Note: `Navigate` is already imported in `App.js:2`. The nested `AddProductPage`/`EditProductPage` files are legacy and not routed here (the router uses `AdminProductFormPage` for both new/edit); confirm during Task 15 whether they are dead. Do NOT delete them in this task.

- [ ] **Step 3: Build and verify all admin routes still resolve**

Run: `cd web && CI=false npm run build`
Expected: build succeeds, no errors.
Then manually (documented in `progress.md`): log in as staff, visit `/admin/dashboard`, `/admin/products`, `/admin/orders`; confirm the sidebar persists across navigation and a non-staff user is redirected to `/`.

At this point the shell wraps pages, but the pages still render their own `min-h-screen bg-[#070B14]` wrapper + `PageHeader`. That double chrome is expected and removed per page in Tasks 10–23. The dashboard is migrated first (Task 10) to prove the pattern.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/admin/AdminShell.js web/src/App.js
git commit -m "feat(admin): persistent admin shell layout route"
```

---

## Task 3: AdminToast

**Files:**
- Create: `web/src/components/admin/AdminToast.js`
- Test: `web/src/components/admin/__tests__/AdminToast.test.js`

**Interfaces:**
- Produces: `AdminToast({ message, type = "success", onClose })` — fixed bottom-right glass toast; `type` ∈ `"success" | "error" | "info"`; auto-dismisses after 3000ms; `role="status"`, `aria-live="polite"`.

- [ ] **Step 1: Write the failing test**

```jsx
// web/src/components/admin/__tests__/AdminToast.test.js
import { render, screen } from "@testing-library/react";
import AdminToast from "../AdminToast";

test("renders message with polite live region", () => {
  render(<AdminToast message="Saved" type="success" onClose={() => {}} />);
  const el = screen.getByText("Saved");
  expect(el).toBeInTheDocument();
  expect(el.closest("[aria-live]").getAttribute("aria-live")).toBe("polite");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/AdminToast.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```jsx
// web/src/components/admin/AdminToast.js
import React, { useEffect } from "react";
import { IoCheckmarkCircle, IoAlertCircle, IoInformationCircle, IoClose } from "react-icons/io5";

const ACCENT = { success: "#D4AF37", error: "#EF4444", info: "#A9B0BE" };
const ICON = { success: IoCheckmarkCircle, error: IoAlertCircle, info: IoInformationCircle };
const TINT = { success: "text-luxury-gold2", error: "text-red-400", info: "text-luxury-mut" };

export default function AdminToast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const Icon = ICON[type] || ICON.success;
  return (
    <div
      role="status"
      aria-live="polite"
      className="glass fixed bottom-5 right-5 z-40 flex items-center gap-3 px-4 py-3 rounded-xl border-l-2 text-sm text-luxury-text"
      style={{ borderLeftColor: ACCENT[type] || ACCENT.success }}
    >
      <Icon className={`text-xl ${TINT[type] || TINT.success}`} />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-luxury-mut hover:text-white" aria-label="Dismiss">
        <IoClose />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/AdminToast.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/AdminToast.js web/src/components/admin/__tests__/AdminToast.test.js
git commit -m "feat(admin): canonical AdminToast primitive"
```

---

## Task 4: AdminModal

**Files:**
- Create: `web/src/components/admin/AdminModal.js`
- Test: `web/src/components/admin/__tests__/AdminModal.test.js`

**Interfaces:**
- Produces: `AdminModal({ open, title, onClose, children, size = "md" })` — glass panel over a `bg-black/60` scrim; `size` ∈ `"sm"|"md"|"lg"|"xl"` → `max-w-md|max-w-2xl|max-w-4xl|max-w-6xl`; Escape and backdrop click call `onClose`; renders nothing when `!open`; `role="dialog"`, `aria-modal="true"`.

- [ ] **Step 1: Write the failing test**

```jsx
// web/src/components/admin/__tests__/AdminModal.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import AdminModal from "../AdminModal";

test("hidden when closed, shown when open, Escape closes", () => {
  const onClose = jest.fn();
  const { rerender } = render(
    <AdminModal open={false} title="X" onClose={onClose}><p>Body</p></AdminModal>
  );
  expect(screen.queryByText("Body")).toBeNull();
  rerender(<AdminModal open title="X" onClose={onClose}><p>Body</p></AdminModal>);
  expect(screen.getByText("Body")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/AdminModal.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```jsx
// web/src/components/admin/AdminModal.js
import React, { useEffect } from "react";
import { IoClose } from "react-icons/io5";

const SIZES = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };

export default function AdminModal({ open, title, onClose, children, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`glass w-full ${SIZES[size]} max-h-[85vh] overflow-y-auto rounded-2xl p-6 sm:p-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-serif text-xl text-white">{title}</h3>
          <button onClick={onClose} className="text-luxury-mut hover:text-white text-lg" aria-label="Close">
            <IoClose />
          </button>
        </div>
        <div className="rule mb-5" />
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/AdminModal.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/AdminModal.js web/src/components/admin/__tests__/AdminModal.test.js
git commit -m "feat(admin): AdminModal glass dialog primitive"
```

---

## Task 5: AdminConfirm

**Files:**
- Create: `web/src/components/admin/AdminConfirm.js`
- Test: `web/src/components/admin/__tests__/AdminConfirm.test.js`

**Interfaces:**
- Consumes: `AdminModal` (Task 4).
- Produces: `AdminConfirm({ open, title, message, confirmText = "Delete", cancelText = "Cancel", tone = "danger", onConfirm, onCancel })` — confirm dialog built on `AdminModal`; `tone="danger"` → red-outline confirm button, `tone="gold"` → `btn-lux` confirm.

- [ ] **Step 1: Write the failing test**

```jsx
// web/src/components/admin/__tests__/AdminConfirm.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import AdminConfirm from "../AdminConfirm";

test("confirm and cancel fire callbacks", () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <AdminConfirm open title="Delete" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />
  );
  fireEvent.click(screen.getByText("Delete", { selector: "button" }));
  expect(onConfirm).toHaveBeenCalled();
  fireEvent.click(screen.getByText("Cancel"));
  expect(onCancel).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/AdminConfirm.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```jsx
// web/src/components/admin/AdminConfirm.js
import React from "react";
import AdminModal from "./AdminModal";

export default function AdminConfirm({
  open,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  const confirmCls =
    tone === "danger"
      ? "border border-red-500/50 text-red-300 hover:bg-red-500/10"
      : "btn-lux";
  return (
    <AdminModal open={open} title={title} onClose={onCancel} size="sm">
      <p className="text-sm text-luxury-mut mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="ghost rounded-full px-5 py-2 text-[11px] label uppercase">
          {cancelText}
        </button>
        <button onClick={onConfirm} className={`rounded-full px-5 py-2 text-[11px] label uppercase ${confirmCls}`}>
          {confirmText}
        </button>
      </div>
    </AdminModal>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/AdminConfirm.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/AdminConfirm.js web/src/components/admin/__tests__/AdminConfirm.test.js
git commit -m "feat(admin): AdminConfirm dialog primitive"
```

---

## Task 6: StatusPill

**Files:**
- Create: `web/src/components/admin/StatusPill.js`
- Test: `web/src/components/admin/__tests__/StatusPill.test.js`

**Interfaces:**
- Produces: `StatusPill({ status, label })` — maps a status string to a semantic bucket and renders a pill. Unknown status → `neutral`. `label` overrides the displayed text (default = `status` with underscores → spaces).

**Before coding:** open `server/shop/models.py` and confirm the order/payment status enum values. Seed the `BUCKET` map below from the observed values (`TO_PAY, TO_SHIP, TO_RECEIVE, TO_RATE, COMPLETED, CANCELLED` for orders; `PENDING, SUCCESS, FAILED, CANCELLED` for payments). Add any additional enum members to the correct bucket — do not guess; read the file.

- [ ] **Step 1: Write the failing test**

```jsx
// web/src/components/admin/__tests__/StatusPill.test.js
import { render, screen } from "@testing-library/react";
import StatusPill, { bucketOf } from "../StatusPill";

test("maps statuses to buckets", () => {
  expect(bucketOf("TO_SHIP")).toBe("progress");
  expect(bucketOf("COMPLETED")).toBe("positive");
  expect(bucketOf("CANCELLED")).toBe("negative");
  expect(bucketOf("WHATEVER")).toBe("neutral");
});

test("renders humanized label", () => {
  render(<StatusPill status="TO_SHIP" />);
  expect(screen.getByText("TO SHIP")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/StatusPill.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```jsx
// web/src/components/admin/StatusPill.js
import React from "react";

const BUCKET = {
  TO_PAY: "progress",
  TO_SHIP: "progress",
  TO_RECEIVE: "progress",
  TO_RATE: "progress",
  PENDING: "progress",
  COMPLETED: "positive",
  SUCCESS: "positive",
  PAID: "positive",
  CANCELLED: "negative",
  FAILED: "negative",
};

const CLS = {
  progress: "border border-luxury-gold/50 text-luxury-gold2",
  positive: "bg-luxury-champagne text-luxury-bg font-semibold",
  neutral: "border border-luxury-mut/40 text-luxury-mut",
  negative: "border border-red-500/50 text-red-300",
};

export function bucketOf(status) {
  return BUCKET[status] || "neutral";
}

export default function StatusPill({ status, label }) {
  const b = bucketOf(status);
  const text = label || String(status || "").replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] tracking-wide ${CLS[b]}`}>
      {text}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/StatusPill.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/StatusPill.js web/src/components/admin/__tests__/StatusPill.test.js
git commit -m "feat(admin): semantic StatusPill primitive"
```

---

## Task 7: DataTable

**Files:**
- Create: `web/src/components/admin/DataTable.js`
- Test: `web/src/components/admin/__tests__/DataTable.test.js`

**Interfaces:**
- Produces: `DataTable({ columns, loading, isEmpty, empty, children, minWidth = 720 })` where `columns` is `[{ label, align }]` (`align` ∈ `"left"|"right"`, default left). Renders `.glass` wrapper + `overflow-x-auto` + `<table>` with a `<thead>` from `columns`. When `loading`, renders a `.skel` block instead of the body. When `isEmpty` (and not loading), renders the `empty` node spanning all columns. Otherwise renders `children` as `<tbody>` rows.

- [ ] **Step 1: Write the failing test**

```jsx
// web/src/components/admin/__tests__/DataTable.test.js
import { render, screen } from "@testing-library/react";
import DataTable from "../DataTable";

const cols = [{ label: "ID" }, { label: "Name" }];

test("shows empty node when isEmpty", () => {
  render(<DataTable columns={cols} isEmpty empty={<div>Nothing here</div>} />);
  expect(screen.getByText("Nothing here")).toBeInTheDocument();
});

test("renders header labels and rows", () => {
  render(
    <DataTable columns={cols}>
      <tr><td>1</td><td>Amelia</td></tr>
    </DataTable>
  );
  expect(screen.getByText("ID")).toBeInTheDocument();
  expect(screen.getByText("Amelia")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/DataTable.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```jsx
// web/src/components/admin/DataTable.js
import React from "react";

export default function DataTable({
  columns = [],
  loading = false,
  isEmpty = false,
  empty = null,
  children,
  minWidth = 720,
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr className="label uppercase text-[10px] text-luxury-mut border-b border-white/10">
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-6 py-4 font-normal ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8">
                  <div className="skel h-24 rounded-xl" />
                </td>
              </tr>
            ) : isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-luxury-mut text-sm">
                  {empty}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/DataTable.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/DataTable.js web/src/components/admin/__tests__/DataTable.test.js
git commit -m "feat(admin): DataTable glass table primitive"
```

---

## Task 8: Toolbar

**Files:**
- Create: `web/src/components/admin/Toolbar.js`
- Test: `web/src/components/admin/__tests__/Toolbar.test.js`

**Interfaces:**
- Produces: `Toolbar({ search, filters, action })` where `search` is `{ value, onChange, placeholder }` or omitted; `filters` and `action` are ReactNodes (e.g. a `Dropdown`, a `btn-lux` button). Renders a responsive flex row: search field (grows) + filters + right-aligned action.

- [ ] **Step 1: Write the failing test**

```jsx
// web/src/components/admin/__tests__/Toolbar.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import Toolbar from "../Toolbar";

test("search calls onChange with input value", () => {
  const onChange = jest.fn();
  render(<Toolbar search={{ value: "", onChange, placeholder: "Search…" }} />);
  fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "abc" } });
  expect(onChange).toHaveBeenCalledWith("abc");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/Toolbar.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```jsx
// web/src/components/admin/Toolbar.js
import React from "react";
import { IoSearchOutline } from "react-icons/io5";

export default function Toolbar({ search, filters, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      {search && (
        <div className="relative flex-1">
          <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-mut" />
          <input
            className="fld w-full rounded-full pl-10 pr-4 py-3 text-sm"
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
          />
        </div>
      )}
      {filters}
      {action && <div className="sm:ml-auto">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/Toolbar.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/Toolbar.js web/src/components/admin/__tests__/Toolbar.test.js
git commit -m "feat(admin): Toolbar search/filter/action primitive"
```

---

## Task 9: Field set + barrel export

**Files:**
- Create: `web/src/components/admin/fields.js`
- Create: `web/src/components/admin/index.js`
- Test: `web/src/components/admin/__tests__/fields.test.js`

**Interfaces:**
- Produces (from `fields.js`):
  - `adminInput` — class string for text/number/time/file inputs (wraps `.fld`).
  - `adminTextarea` — class string for textareas.
  - `AdminField({ label, htmlFor, required, children })` — labeled wrapper (`.label` uppercase mut label + child control).
  - `AdminToggle({ checked, onChange, label })` — gold pill switch (replaces bare checkboxes for booleans like `is_open_24h`).
- Produces (from `index.js`): barrel re-exporting `AdminShell, AdminToast, AdminModal, AdminConfirm, StatusPill, bucketOf, DataTable, Toolbar, AdminField, AdminToggle, adminInput, adminTextarea`.

- [ ] **Step 1: Write the failing test**

```jsx
// web/src/components/admin/__tests__/fields.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminField, AdminToggle } from "../fields";

test("AdminField renders label and marks required", () => {
  render(<AdminField label="Name" required><input /></AdminField>);
  expect(screen.getByText("Name")).toBeInTheDocument();
  expect(screen.getByText("*")).toBeInTheDocument();
});

test("AdminToggle flips on click", () => {
  const onChange = jest.fn();
  render(<AdminToggle checked={false} onChange={onChange} label="Open 24h" />);
  fireEvent.click(screen.getByRole("switch"));
  expect(onChange).toHaveBeenCalledWith(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/fields.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```jsx
// web/src/components/admin/fields.js
import React from "react";

export const adminInput = "fld w-full rounded-lg px-4 py-3 text-sm";
export const adminTextarea = "fld w-full rounded-lg px-4 py-3 text-sm resize-none";

export function AdminField({ label, htmlFor, required = false, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label uppercase text-[10px] text-luxury-mut block mb-2">
        {label} {required && <span className="text-luxury-gold2">*</span>}
      </label>
      {children}
    </div>
  );
}

export function AdminToggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3"
    >
      <span
        className={`w-10 h-6 rounded-full p-0.5 transition ${checked ? "bg-luxury-gold" : "bg-white/10"}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </span>
      {label && <span className="text-sm text-luxury-text">{label}</span>}
    </button>
  );
}
```

```jsx
// web/src/components/admin/index.js
export { default as AdminShell } from "./AdminShell";
export { default as AdminToast } from "./AdminToast";
export { default as AdminModal } from "./AdminModal";
export { default as AdminConfirm } from "./AdminConfirm";
export { default as StatusPill, bucketOf } from "./StatusPill";
export { default as DataTable } from "./DataTable";
export { default as Toolbar } from "./Toolbar";
export { AdminField, AdminToggle, adminInput, adminTextarea } from "./fields";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && CI=true npx react-scripts test --watchAll=false src/components/admin/__tests__/fields.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/fields.js web/src/components/admin/index.js web/src/components/admin/__tests__/fields.test.js
git commit -m "feat(admin): field primitives + admin barrel export"
```

---

## Page migration recipe (Tasks 10–23)

Each page task is a **visual refactor of one existing file**. The primitives are done; each page swaps its bespoke markup for them while preserving behaviour. **Every page task follows this loop:**

1. **Read the full page file first** (harness Read-Before-Writing). Inventory: every `http` call, every state variable, every handler, every route/navigate target. These are invariants — do not change them.
2. Remove the page's own outer chrome: the `min-h-screen bg-[#070B14] …` wrapper `<div>` and the `<PageHeader …/>` (its role is now the shell top bar). Replace the page's title/action with a `useAdminChrome({ title, actions, backTo })` call at the top of the component. The "Add X" button becomes the `actions` node.
3. Replace the page's private `Toast` component and state with the shared `AdminToast` (keep the page's existing toast *state* shape or adapt call sites; the component is what changes).
4. Replace the page's private `Confirm`/`ConfirmDelete`/`ConfirmModal` with `AdminConfirm`.
5. Replace any detail/form popover `fixed inset-0 …` block with `AdminModal`.
6. **Archetype A:** replace the raw `<table>` with `DataTable` (`columns` + `.row` `<tr>` children); replace status `<span>`s with `StatusPill`; put search/filter/add into `Toolbar`; replace native `<select>` filters with `Dropdown`.
7. **Archetype B/C:** wrap inputs in `AdminField`; apply `adminInput`/`adminTextarea`; replace native `<select>` with `Dropdown`; replace bare boolean checkboxes with `AdminToggle`; put the primary/secondary/destructive actions into a `.btn-lux` / `.ghost` / red-ghost sticky save bar.
8. Delete every off-palette utility on the page: `bg-white/10`, `bg-white/20`, `bg-[#…]`, flat `bg-red-600`/`bg-gray-*` buttons (→ `.ghost`/red-ghost/`.btn-lux`), emoji status/icon markers (→ react-icons or `StatusPill`), `z-[9999]` (→ `z-40`).
9. **Verify:** `cd web && CI=false npm run build` passes; then drive the page's real flows against live data (list load, view, create, edit, delete-with-confirm, toast success + error, filter/search) and record observed results in `progress.md`. Screenshot and compare to the mockup archetype.
10. One commit: `feat(web): luxury redesign <page>`.

**Worked example per archetype is embedded in the first task of each group (Tasks 11, 17, 18).** Apply the same transformation to the sibling pages in that group.

---

## Task 10: Migrate AdminDashboardPage (prove the shell)

**Files:**
- Modify: `web/src/pages/admin/AdminDashboardPage.js`

The dashboard already carries an inline sidebar and its own layout — now redundant with `AdminShell`.

- [ ] **Step 1:** Read `web/src/pages/admin/AdminDashboardPage.js` in full.
- [ ] **Step 2:** Remove the inline `<aside>` sidebar and the outer `relative flex min-h-[80vh]` + fixed glow `<div>` (the shell supplies both). Remove the `NAV` array and `useLocation` if now unused. Keep the stats fetch (`/admin/dashboard-stats/`), `stats` state, `primary`/`manage` arrays.
- [ ] **Step 3:** At the top of the component add:

```jsx
useAdminChrome({ title: "Dashboard", actions: null, backTo: "/admin/dashboard" });
```

Import: `import { useAdminChrome } from "../../context/AdminChromeContext";`

- [ ] **Step 4:** Return only the content (the eyebrow+`<h1>` can be dropped since the shell shows the title; keep the stat-card grid and Management grid exactly as-is). Wrap in a `<div className="space-y-8">`.
- [ ] **Step 5:** Build: `cd web && CI=false npm run build` → succeeds. Manually confirm `/admin/dashboard` shows one sidebar (not two), stats load, cards link correctly. Record in `progress.md`.
- [ ] **Step 6:** Commit:

```bash
git add web/src/pages/admin/AdminDashboardPage.js
git commit -m "feat(web): dashboard onto admin shell"
```

---

## Task 11: Migrate AdminOrdersPage (Archetype A worked example)

**Files:**
- Modify: `web/src/pages/admin/AdminOrdersPage.js`

**Invariants to preserve** (from the current file): `GET /admin/orders/`; `handleStatusChange(orderId, newStatus)` → `POST /admin/orders/{id}/update_status/`; `handleDelete(orderId)` → `DELETE /admin/orders/{id}/`; the `search` + `sortStatus` filter memo; the `payment`/`method`/`pStatus` display; toast + confirm state.

- [ ] **Step 1:** Read the full file.
- [ ] **Step 2: Write the redesigned component.** This is the reference implementation the other table pages copy:

```jsx
import React, { useEffect, useState, useMemo } from "react";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminToast, AdminConfirm, DataTable, Toolbar, StatusPill,
} from "../../components/admin";
import { Dropdown } from "../../components/ui";

const STATUS_FILTER = [
  { value: "ALL", label: "All statuses" },
  { value: "TO_PAY", label: "To Pay" },
  { value: "TO_SHIP", label: "To Ship" },
  { value: "TO_RECEIVE", label: "To Receive" },
  { value: "TO_RATE", label: "To Rate" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];
const STATUS_OPTIONS = STATUS_FILTER.filter((s) => s.value !== "ALL");

const COLUMNS = [
  { label: "ID" }, { label: "Customer" }, { label: "Order status" },
  { label: "Payment" }, { label: "Total", align: "right" }, { label: "Actions", align: "right" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState("ALL");
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useAdminChrome({ title: "Orders", actions: null, backTo: "/admin/dashboard" });

  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => {
    http.get("/admin/orders/")
      .then((res) => setOrders(res.data))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await http.post(`/admin/orders/${orderId}/update_status/`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      showToast("Order status updated");
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleDelete = (orderId) =>
    setConfirmAction({
      title: "Delete Order",
      message: "Delete this order? This cannot be undone.",
      onConfirm: async () => {
        try {
          await http.delete(`/admin/orders/${orderId}/`);
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
          showToast("Order deleted");
        } catch {
          showToast("Failed to delete order", "error");
        } finally {
          setConfirmAction(null);
        }
      },
    });

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => {
          if (!search) return true;
          const t = search.trim().toLowerCase();
          return String(o.id).includes(t) || o.user?.username?.toLowerCase().includes(t);
        })
        .filter((o) => (sortStatus === "ALL" ? true : o.status === sortStatus)),
    [orders, search, sortStatus]
  );

  if (error) return <p className="text-red-300 text-sm">{error}</p>;

  return (
    <div className="space-y-2">
      <Toolbar
        search={{ value: search, onChange: setSearch, placeholder: "Search by order ID or customer…" }}
        filters={
          <Dropdown
            value={sortStatus}
            onChange={setSortStatus}
            options={STATUS_FILTER}
            align="right"
            className="fld rounded-full px-5 py-3 text-sm min-w-[180px]"
          />
        }
      />
      <DataTable
        columns={COLUMNS}
        loading={loading}
        isEmpty={!loading && filtered.length === 0}
        empty="No orders found."
      >
        {filtered.map((o) => (
          <tr key={o.id} className="row">
            <td className="px-6 py-4 text-luxury-mut">#{o.id}</td>
            <td className="px-6 py-4 text-luxury-text">{o.user?.username}</td>
            <td className="px-6 py-4"><StatusPill status={o.status} /></td>
            <td className="px-6 py-4">
              {o.payment
                ? <StatusPill status={o.payment.status} label={`${o.payment.method} · ${o.payment.status}`} />
                : <StatusPill status="UNPAID" label="Unpaid" />}
            </td>
            <td className="px-6 py-4 text-right text-luxury-champagne" style={{ fontVariantNumeric: "tabular-nums" }}>
              RM {o.total ? Number(o.total).toFixed(2) : "0.00"}
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-end gap-2">
                <Dropdown
                  value={o.status}
                  onChange={(v) => handleStatusChange(o.id, v)}
                  options={STATUS_OPTIONS}
                  align="right"
                  className="fld rounded-full px-3 py-1.5 text-[11px] min-w-[130px]"
                />
                <button
                  onClick={() => handleDelete(o.id)}
                  className="rounded-full px-3 py-1.5 text-[11px] border border-red-500/50 text-red-300 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {confirmAction && (
        <AdminConfirm
          open
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText="Delete"
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {toast && <AdminToast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
```

Note: `Dropdown`'s API is confirmed — `value`, `onChange(value)`, `options: [{value,label}]`, `className` (trigger), `align`. The trigger is unstyled by default, so always pass a `.fld` `className` as shown.

- [ ] **Step 3:** Build: `cd web && CI=false npm run build` → succeeds.
- [ ] **Step 4:** Manually verify against live data: search, status filter, inline status change persists, delete→confirm→toast, error toast path. Record in `progress.md`.
- [ ] **Step 5:** Commit:

```bash
git add web/src/pages/admin/AdminOrdersPage.js
git commit -m "feat(web): luxury redesign orders management"
```

---

## Tasks 12–16: Remaining Archetype A pages

Apply the Task 11 recipe. One task = one page = one commit. For each: **Read the file first**, list its invariants, then transform. Column sets and invariants below are starting points — confirm against each file.

- [ ] **Task 12 — AdminProductsPage** (`web/src/pages/admin/AdminProductsPage.js`)
  - Invariants: `GET /admin/products/`; delete `DELETE /admin/products/{id}/`; `details` view modal; `navigate("/admin/products/new")` and `/admin/products/{id}/edit`.
  - `actions`: `<Link to="/admin/products/new" className="btn-lux …">Add Product</Link>` via `useAdminChrome`.
  - Columns: ID, Name, Category, Target, Price (right), Stock (right), Actions (right). Detail popover → `AdminModal`. Delete → `AdminConfirm`. Toast → `AdminToast`.
  - Commit: `feat(web): luxury redesign products management`.

- [ ] **Task 13 — AdminPaymentsPage** (`web/src/pages/admin/AdminPaymentsPage.js`)
  - Read first; map payment method/status spans to `StatusPill`. Commit: `feat(web): luxury redesign payments management`.

- [ ] **Task 14 — AdminUsersPage** (`web/src/pages/admin/AdminUsersPage.js`)
  - Read first; table of users + row actions. Commit: `feat(web): luxury redesign users management`.

- [ ] **Task 15 — AdminReviewPage** (`web/src/pages/admin/AdminReviewPage.js`)
  - RECLASSIFIED (2026-07-16, found during execution): NOT a plain table. It is a
    card/list UI — product filter (`GET /admin/products/`), review fetch
    (`GET /admin/reviews/` and `?product=<name>`), `DELETE /admin/reviews/{id}/`, a
    collapsible aggregate-summary panel, an optional per-product summary, and the main
    list rendered as expandable review cards (comments + media gallery).
  - Treatment: keep the existing structure; reskin only. Product filter → `Toolbar` +
    `Dropdown`; summary panel + each review → `.glass` panels/cards; delete → `AdminConfirm`;
    toast → `AdminToast`. Do NOT force it into `DataTable`. Preserve every endpoint,
    handler, and the expand/collapse + summary logic verbatim.
  - Commit: `feat(web): luxury redesign reviews management`.

- [ ] **Task 16 — AdminARManagement** (`web/src/pages/admin/AdminARManagement.js`)
  - Read first; table + `navigate` to `/admin/ar-management/new` and `/:id/edit`. `actions`: Add AR button. Commit: `feat(web): luxury redesign AR management`.

Each task ends with `CI=false npm run build` passing + a `progress.md` manual-verification entry.

---

## Task 17: Migrate AdminRetailersPage (Archetype B worked example)

**Files:**
- Modify: `web/src/pages/admin/AdminRetailersPage.js`

**Invariants:** `GET /retailers/`; create `POST /retailers/` and update `PUT /retailers/{id}/` (multipart); `DELETE /retailers/{id}/`; the `form` state shape (`name,address,opening_time,closing_time,is_open_24h,phone,map_url,image`); the `onSubmit` time-normalization (`:00` suffix) and server-error parsing.

- [ ] **Step 1:** Read the full file.
- [ ] **Step 2:** Transform:
  - `useAdminChrome({ title: "Retailers", actions: <button onClick={openCreate} className="btn-lux …">Add Retailer</button>, backTo: "/admin/dashboard" })`. Because `actions` needs `openCreate`, define handlers above the hook call and pass the node.
  - Card grid: keep `grid sm:grid-cols-2 xl:grid-cols-3 gap-6`; each card → `.card glass rounded-2xl`; image block; `h3` name; address `text-luxury-mut`; hours → `StatusPill` (`is_open_24h` → `label="Open 24 Hours"` positive; else a neutral pill with the `HH:MM–HH:MM` label); Edit → `.ghost`, Delete → red-ghost.
  - Form modal → `AdminModal` (size `lg`); fields wrapped in `AdminField` + `adminInput`; `is_open_24h` → `AdminToggle`; time inputs keep `type="time"` with `adminInput`.
  - Delete confirm → `AdminConfirm`; toasts → `AdminToast`. Keep `apiError` inline block but restyle to `glass border border-red-500/40`.
- [ ] **Step 3:** Build passes.
- [ ] **Step 4:** Manually verify create/edit/delete + 24h toggle + image upload + server-error display. Record in `progress.md`.
- [ ] **Step 5:** Commit: `feat(web): luxury redesign retailers management`.

---

## Task 18: Migrate AdminAboutPage (Archetype C worked example)

**Files:**
- Modify: `web/src/pages/admin/AdminAboutPage.js`

**Invariants:** `GET /site/about/` (create-if-empty `POST`); `PATCH /site/about/{id}/` (multipart, JSON-stringifying `social_links`/`gallery_images`/`social_icons`); `social_icon_{platform}` file appends; the social-link add/remove/change handlers; reset handler; the `127.0.0.1:8000` relative-URL fix.

> Note the `http://127.0.0.1:8000` hardcode in the current file — leave the URL logic exactly as-is (out of visual scope), but flag it in `progress.md` as a follow-up (it will break icons in production). Do not change behaviour in this task.

- [ ] **Step 1:** Read the full file.
- [ ] **Step 2:** Transform:
  - `useAdminChrome({ title: "About Page", actions: null, backTo: "/admin/dashboard" })`; remove `PageHeader` + outer wrapper.
  - Wrap the whole form in one `.glass rounded-2xl p-6 sm:p-8 space-y-6` panel. Each field → `AdminField` + `adminInput`/`adminTextarea`.
  - Social-links editor: keep the map + handlers; restyle rows to hairline `.rule` separators; "Change Icon"/"Add"/"Remove" → `.ghost`/red-ghost; the Add-Social popover → `AdminModal`.
  - Actions → sticky save bar: Reset (red-ghost) + Save (`btn-lux`). Toast → `AdminToast`. Confirm-reset → `AdminConfirm` (already uses `ConfirmModal`; swap it).
- [ ] **Step 3:** Build passes.
- [ ] **Step 4:** Manually verify load, edit text fields, save, reset-confirm, add/remove social link. Record in `progress.md`.
- [ ] **Step 5:** Commit: `feat(web): luxury redesign about editor`.

---

## Tasks 19–23: Remaining Archetype C pages

Apply the Task 17/18 recipes. One task = one page = one commit. **Read each file first.**

- [ ] **Task 19 — AdminProductFormPage** (`web/src/pages/admin/AdminProductFormPage.js`) — the routed create/edit product form. Fields → `AdminField` + `adminInput`; category → `Dropdown`; tags → keep `TagsInput` (restyle only if trivial); media/image uploads keep handlers; sticky save bar. Commit: `feat(web): luxury redesign product form`.
- [ ] **Task 20 — AdminScentPersonaPage** (`web/src/pages/admin/AdminScentPersonaPage.js`) — read first; form/editor. Commit: `feat(web): luxury redesign scent personas`.
- [ ] **Task 21 — AdminAREditPage** (`web/src/pages/admin/AdminAREditPage.js`) — read first; AR experience editor form. Commit: `feat(web): luxury redesign AR editor`.
- [ ] **Task 22 — AdminQuizManagement** (`web/src/pages/admin/AdminQuizManagement.js`) — read first; nested question/option editor. Preserve the nested add/remove/reorder handlers; apply `AdminField`/`.glass`/sticky save; nested blocks become `.glass` sub-panels. Commit: `feat(web): luxury redesign quiz management`.
- [ ] **Task 23 — Legacy product forms** (`web/src/pages/admin/AddProductPage.js`, `EditProductPage.js`) — Determine if still imported/routed anywhere (grep `AddProductPage`/`EditProductPage`). If dead (router uses `AdminProductFormPage`), propose deletion to the user and, on approval, remove them. If live, migrate to the Archetype C recipe. Commit accordingly.

---

## Task 24: Cleanup + phase close

**Files:** repo-wide check under `web/src/pages/admin/` + `progress.md` + `context.md`.

- [ ] **Step 1:** Grep for remaining debt in admin pages and confirm zero (or justified) hits:

```bash
cd web && grep -rnE "bg-\[#|bg-white/(10|20)|bg-red-600|z-\[9999\]|<select" src/pages/admin || echo "clean"
```

Expected: `clean` (any survivor is fixed or explicitly justified in `progress.md`).

- [ ] **Step 2:** Remove now-unused imports repo-wide (old `PageHeader`, `ConfirmModal`, per-page `Toast`/`Confirm` definitions). Build: `cd web && CI=false npm run build` → succeeds with no new warnings about unused vars in the touched files.
- [ ] **Step 3:** Run the full admin unit suite:

```bash
cd web && CI=true npx react-scripts test --watchAll=false src/components/admin
```

Expected: all pass.

- [ ] **Step 4:** Update `context.md` if any admin-facing behaviour statement changed (none expected — visual-only) and append the phase summary + manual-test evidence to `progress.md`.
- [ ] **Step 5:** Phase review: run `/code-review` on the branch diff. (`/security-review` not required — no auth/storage/CORS/permission change.) Resolve findings.
- [ ] **Step 6:** Merge to `main` via `--no-ff` PR, tag `phase-7-admin-ui`, push branch + tag.

```bash
git commit -am "docs: phase-7 admin redesign progress + context reconcile"
```

(Merge/tag/push performed by the user or on explicit instruction — no auto-push.)

---

## Self-Review

**Spec coverage:** §2 baseline → Global Constraints + Tasks 1–9. §3 mapping → Tasks 11–23 grouped by archetype. §4.1 shell → Tasks 1–2. §4.2 primitives → Tasks 3–9. §4.3 StatusPill map → Task 6. §4.4 data-flow-unchanged → the "Invariants" blocks + recipe step 1. §5 non-goals → honored (no bulk actions, no backend, no new deps). §6 testing → per-task build + manual `progress.md` + unit tests + Task 24 suite. §7 build sequence → task order 1→24. All spec sections map to tasks.

**Placeholder scan:** New code (context, shell, 7 primitives) is shown in full with tests. Page tasks are refactors of files that MUST be read first (harness rule); the transformation is a concrete step list + a fully-worked reference implementation per archetype (Tasks 11, 17, 18), not "implement later." The one deferred decision (legacy AddProduct/EditProduct deletion, Task 23) is gated on a grep + user approval — intentional, not a gap.

**Type consistency:** `useAdminChrome({title,actions,backTo})` defined in Task 1, consumed identically in Tasks 2, 10, 11, 17, 18. `DataTable` `columns/{label,align}` + `isEmpty/empty/loading` consistent between Task 7 and Task 11. `StatusPill({status,label})` + `bucketOf` consistent between Task 6 and Tasks 11–13, 17. `Dropdown` prop shape flagged for verification against its source before first use (Task 11 step 2 note). Barrel exports (Task 9) match every later import path (`../../components/admin`).
