# Phase 3 — Correctness, Security Hardening & Minimal CI — Implementation Plan

> **For executors (Codex):** implement task-by-task in the order under "Sequencing". Each code
> task is RED → GREEN → full relevant test run → diff self-review → owner approval → one
> Conventional Commit. Halt-and-ask on any ambiguity (`CLAUDE.md` §1).

**Goal:** Close the correctness/security findings deferred to Phase 3, restore a working email
path (Brevo), and add a minimal CI gate — without changing the storage/AR behavior from Phases
1–2.

**Branch:** `phase-3-hygiene` off `main` → annotated tag `phase-3-hygiene` on completion.

**Tech stack (unchanged):** Django 5.2 / DRF / SimpleJWT, React 19 (CRA), pytest. New runtime
dep: **Brevo** transactional email (HTTP API or SMTP; decided in Task 7) — replaces SendGrid.

---

## Governing requirements / findings (context.md §8)

| Task | Finding(s) | Theme |
|---|---|---|
| 1 | #14 fail-open `DEBUG`/`SECRET_KEY` (+ env load-order fix); #4 `MEDIA_URL`/`MEDIA_ROOT` | Config safety |
| 2 | #15 password validators + auth throttling | Auth hardening |
| 3 | #8 checkout oversell + float money | Correctness |
| 4 | #9 quiz answers not scoped | Correctness |
| 5 | #13 unify admin authority on `is_staff` | AuthZ consistency |
| 6 | #6 canonicalize duplicate auth/reset routes; #17 Google login (identity + verification) | Routes + auth |
| 7 | #19 email → **Brevo** | Email |
| 8 | #3 dead `config/api.js`; #5 `ProtectedRoute` flag; #7 `App.test.js` | Frontend hygiene |
| 9 | #18 CDN SRI/pinning (CSP + cookie migration **deferred, tracked**) | Client hardening |
| 10 | #7 minimal CI (pytest + build **+ Jest**) | CI |
| 11 | — | Review, merge, tag |

---

## Locked scope decisions (owner-approved 2026-06-22)

1. **Email = Brevo** (no custom domain owned; Brevo single-verified-sender works without DNS).
   Owner creates the account + API key + verified sender. Confirm current free-tier terms in the
   Brevo console (web lookup was unavailable). *Resend deferred — needs a domain.*
2. **Admin authority = `is_staff` is the SOLE source of truth.** Mechanics (amended — do NOT let
   arbitrary `role="admin"` saves silently elevate): one-time data-migration **backfill** so
   existing `role=="admin"` users get `is_staff=True`; expose **read-only** `is_staff` to the
   frontend; the app sets `is_staff` deliberately (admin action), and `role` is synced/deprecated
   **from** `is_staff`, never the reverse.
3. **Throttling** (DRF scoped): **5/min** login + signup, **3/min** password-reset **request and
   confirm**. NOTE: LocMem throttle state is **per-process** — under Cloud Run autoscaling this is
   per-instance, not shared; shared enforcement (Redis/Memorystore) is deferred to deploy work.
4. **Deferred & tracked as security debt** (record in context.md §8 #18): `localStorage` →
   httpOnly-cookie migration, refresh-token revocation on logout, and a CSP. Phase 3 does only
   **SRI + pinned versions** on externally-loaded scripts.

---

## Execution constraints (CLAUDE.md)

- Branch `phase-3-hygiene` off updated `main`; one Conventional Commit per task after tests pass
  + owner approves the diff.
- Backend logic ships `pytest` tests (sandbox: `PYTHONUTF8=1`, `-p no:cacheprovider
  --basetemp=/tmp/elzpt`). UI changes: build + documented manual steps.
- No new dependency beyond the Brevo client without listing it for approval.
- Docs (`context.md`/`progress.md`/`task_plan.md`) updated in the same task; mark each §8 item
  resolved as it lands.
- Only Task 7's real email send-test touches an external service — that step is an owner checkpoint.

---

## Tasks

### Task 1 — Fail-closed config, env load order, media (#14, #4)
- **Files:** `server/backend/settings.py`, `server/backend/settings_test.py`,
  `server/backend/.env.sample`; tests `server/shop/tests/test_settings_safety.py`.
- **FIRST fix the load order (review finding):** `settings.py` currently reads `DEBUG` (L31)
  *before* loading `server/backend/.env` (L35). Load the project `.env` **before** evaluating
  `DEBUG`/`SECRET_KEY` so env values are respected.
- **Then:** default `DEBUG=False` (opt-in True via env); when `DEBUG` is False, **require** a real
  `DJANGO_SECRET_KEY` (raise `ImproperlyConfigured` if unset or `"dev-only"`). Define
  `MEDIA_URL`/`MEDIA_ROOT`. Keep `settings_test.py` working (it sets its own values).
- **Test:** with `.env` providing `DJANGO_DEBUG=True`, DEBUG is True; under DEBUG=False without a
  real key → raises; with a real key → ok; `MEDIA_URL/ROOT` defined; `settings_test` still imports.

### Task 2 — Password validators + auth throttling (#15)
- **Files:** `settings.py` (`AUTH_PASSWORD_VALIDATORS`, DRF throttle rates/scopes),
  `server/shop/serializers.py` (signup + reset-confirm run validators), auth/reset views
  (throttle scopes); tests `test_password_policy.py`, `test_auth_throttle.py`.
- **Do:** enforce Django validators (min len ≥ 8, common-password, numeric) on signup **and**
  reset-confirm; apply the approved scoped throttles to login/signup/reset-request/reset-confirm.
- **Test:** weak password rejected on both paths; 429 past each limit. (Document the per-instance
  LocMem caveat.)

### Task 3 — Atomic checkout + Decimal money (#8)
- **Files:** `server/shop/serializers.py` (Order create ~L692); tests `test_checkout.py`.
- **Do:** `transaction.atomic` + `select_for_update()` on products; `F()` stock decrement; reject
  oversell atomically; totals as `Decimal`. **Test:** oversell rejected; exact Decimal total;
  stock decremented once.

### Task 4 — Quiz answer scoping (#9)
- **Files:** `server/shop/views.py` (~L669); tests `test_quiz_scoping.py`.
- **Do:** score only answers belonging to the submitted quiz. **Test:** foreign-quiz answers
  can't influence the result.

### Task 5 — Unify admin authority on `is_staff` (#13)
- **Files:** data migration (one-time backfill `role=="admin"` → `is_staff=True`),
  `server/shop/models.py`/serializers (expose **read-only** `is_staff`; sync/deprecate `role`
  from `is_staff`), frontend admin guard reads the single flag; tests `test_admin_authority.py`.
- **Do:** per locked decision #2 — **no auto-elevation on role save.** **Test:** backfilled admins
  are `is_staff`; a normal user setting `role` does not become staff; admin endpoints consistent.

### Task 6 — Route canonicalization + Google login hardening (#6, #17)
- **Files:** `server/backend/urls.py`, `server/shop/urls.py` (de-duplicate the overlapping
  `dj_rest_auth`/`allauth`/reset prefixes — **do this before Task 7 wires email into them**);
  `server/shop/social_views.py`; tests `test_routes.py`, `test_google_login.py`.
- **MUST also remove (Task 2 review finding):** the dead, shadowed, **unthrottled**
  `path("api/token/", TokenObtainPairView…)` at `backend/urls.py:21` (the throttled
  `MyTokenObtainPairView` from `shop.urls` already serves `/api/token/`; the base route is a
  throttle-bypass footgun + duplicate `name="token_obtain_pair"`). Verify `/api/token/` stays
  throttled after removal.
- **Do:** collapse duplicate auth/reset routes to one canonical set. For Google: require
  `email_verified`; treat email identity as **normalized + case-insensitive**; handle
  username/email collisions and the create race deterministically; never return raw
  verification-exception text. **Test:** one canonical route each; unverified email rejected;
  case-variant emails map to one account; generic error body.

### Task 7 — Email via Brevo (#19)
- **Files:** `server/shop/email_service.py` (Brevo behind a thin interface), remove
  `password_reset_sendgrid.py` usage, `requirements.txt` (drop `sendgrid`, add Brevo client),
  `.env.sample`/`context.md`; tests `test_email.py` (locmem/mock — no live send in CI).
- **Do:** route password-reset + transactional mail through Brevo; **console backend when
  unconfigured.** **Owner checkpoint:** one real send-test from the owner's Brevo account before
  marking done. **Pre-req:** Task 6 routes canonicalized; owner API key + verified sender.

### Task 8 — Frontend hygiene (#3, #5, #7-frontend)
- **Files:** delete `web/src/config/api.js`; fix `web/src/components/ProtectedRoute.js` (it reads
  `loading` from `useAuth()` — verify the context's real flag name and use it so a valid admin
  isn't redirected mid-load); repair `web/src/App.test.js` into a meaningful passing test.
- **Also (Task 5 review follow-ups, cosmetic):** switch `web/src/pages/admin/AdminUsersPage.js`
  (~L144) badge from `role === "admin"` to `is_staff`; and add a reverse backfill so existing
  `is_staff=True`/`role=user` users get `role="admin"` (display consistency — append to a data
  migration; the invariant is otherwise enforced by `User.save()`).
- **Test:** `npm run build` exits 0; the repaired Jest test passes; guard no longer flickers
  (manual).

### Task 9 — CDN SRI + pinning (#18 partial)
- **Files:** `web/src/pages/ARViewer.js` (scripts are injected **dynamically** via `createElement`
  → set `integrity` + `crossOrigin` **before** `src`) and any static `<script>` tags; pin exact
  versions; `context.md` §8 #18 records CSP + cookie migration + refresh revocation as deferred.
- **Test:** build + **re-verify web AR B1/B2** (both GLBs still render + animate — SRI must not
  break loading). If a CDN asset lacks stable SRI/CORS, self-host the pinned file instead.

### Task 10 — Minimal CI (#7)
- **Files:** `.github/workflows/ci.yml`.
- **Do:** on push/PR — backend `pytest` (isolated settings, no live services) **and** frontend
  `npm ci` + the repaired Jest test + `CI=false npm run build`. No deploy.
- **Test:** workflow green on the branch.

### Task 11 — Review, merge, tag
- `/code-review` + `/security-review` over `main...phase-3-hygiene`; resolve findings. Fresh full
  verification (pytest, check, build, fresh migrate). Owner approves → merge `--no-ff` → tag
  `phase-3-hygiene` → push.

---

## Sequencing
1. **Task 1** (after the env load-order fix) → 2. **Task 3** → 3. **Task 4** (independent, no
   decisions) → then **Task 2**, **Task 5**, **Task 6** → **Task 7** (needs Task 6 routes + Brevo
   key) → **Task 8** → **Task 9** → **Task 10** → **Task 11**.
- Route canonicalization (Task 6) precedes email (Task 7) so email isn't wired into routes that
  get removed.

## Self-review
- Every task maps to a §8 item / roadmap; no orphan work. Each backend task ships tests; UI tasks
  build + manual-verify; only Task 7's owner send-test writes externally.
- Locked decisions are recorded, not guessed; cookie/CSP/revocation explicitly deferred + tracked.
- Rollback = revert the per-task commit; phase rollback = `phase-2-storage-gcs` tag.
