# context.md — Project Context & Specifications

Canonical specification for the Eleganza / GERAIN CHAN AR perfume project. This is the
single source of truth for **what** the system does. Process rules live in
[`CLAUDE.md`](./CLAUDE.md). Keep this file aligned with the code at every commit boundary.

> Non-functional targets in §5 are marked **(PROPOSED)** — derived from the codebase,
> pending the owner's confirmation. Do not treat proposed numbers as binding until approved.

---

## 1. Overview

A perfume e-commerce website with Augmented Reality product previews. Customers browse and
buy fragrances, take a scent-finder quiz, read/leave reviews, and view products in AR —
either in-browser (camera + printed marker) or via a downloadable Android app. An admin
panel manages the full catalog, orders, AR assets, and site content.

Origin: Final Year Project. Single-owner maintenance.

---

## 2. Components & Repository Layout

| Component | Path | Stack | Role |
|---|---|---|---|
| Backend API | `server/` (`backend/` project, `shop/` app, `manage.py`) | Django 5.2, DRF, SimpleJWT | REST API, auth, admin, persistence |
| Web frontend | `web/` | React 19 (CRA) | Customer + admin SPA |
| Web AR | `web/src/pages/ARViewer.js`, assets in `ar-assets/`, `tools/mindar_builder/` | MindAR 1.2.3 + A-Frame 1.5.0 | In-browser marker AR |
| Mobile AR | `mobile/arApp/` → `mobile/fyp.apk` | Unity | Native Android marker AR (download only) |

**Tracked in git:** `server/` (Django backend), `web/` (frontend), `docs/`, plus governance
docs (`CLAUDE.md`, `context.md`) and planning files (`task_plan.md`, `findings.md`,
`progress.md`) at root.
**Not tracked (local/artifact only):** `mobile/arApp/`, `mobile/fyp.apk`, `server/media/`,
`ar-assets/`, `tools/mindar_builder/`, `server/db.sqlite3`, `venv/`.

The Unity project is **not actively developed** — it exists only to produce the `.apk`,
which is stored as a downloadable binary (object storage).

---

## 3. Functional Specifications (FR)

Derived from code review of `server/shop/models.py`, `server/shop/views.py`,
`server/shop/urls.py`, and the React pages.

- **FR-1 — Authentication & Accounts**
  - Email/username + password signup and login (JWT access 30 min / refresh 90 d).
  - Google OAuth login via verified `id_token` (`server/shop/social_views.py`).
  - Password reset via SendGrid (request + confirm).
  - Roles: `user`, `admin` (gates admin panel + admin API).
  - Profile: avatar, phone, structured address.

- **FR-2 — Product Catalog**
  - Products with name, category, gender target (MEN/WOMEN/UNISEX), price, stock,
    description, tags, promo image, card image, media gallery (image/video).
  - Public list + detail; admin CRUD.

- **FR-3 — AR Experiences** (one or more per product)
  - Types: marker-based and markerless.
  - Assets: marker image, `.mind` target file, `.glb` 3D model, downloadable `.apk`.
  - `enabled` flag per experience.
  - **FR-3.1 — Web AR must render the `.glb` on the detected marker AND play the model's
    embedded animation.** (Currently the model renders static — see §8.)
  - **FR-3.2 — Mobile AR**: the `.apk` provides native Android marker AR; offered as a
    download. Unity source is not maintained beyond producing this binary.

- **FR-4 — Cart**: per-user cart; add / update quantity / remove items.

- **FR-5 — Orders**: created from cart with delivery address; status workflow
  TO_PAY → TO_SHIP → TO_RECEIVE → TO_RATE → COMPLETED / CANCELLED; line items snapshot price.

- **FR-6 — Payments**: methods CARD / FPX / E-WALLET / COD. **Simulated** — no real gateway.
  Amount mirrors order total server-side; status PENDING/SUCCESS/FAILED/CANCELLED.

- **FR-7 — Scent Quiz / Recommender**: quizzes with questions and category-mapped answers;
  optional audience filter and product whitelist; result recommends a category + products
  and a scent persona.

- **FR-8 — Scent Personas**: admin-editable persona per product category (name, tagline,
  notes, occasions, images).

- **FR-9 — Reviews**: rating + comment + media (image/video) per product; admin moderation;
  media auto-deleted from storage on record delete.

- **FR-10 — Retailers**: store locator (name, address, operating hours / 24h flag, phone,
  map link, image).

- **FR-11 — Site About**: editable About page (title, intro, body, mission, vision, hero +
  gallery images, contact info, social links + uploaded social icons).

- **FR-12 — Admin Panel**: dashboard stats + CRUD for users, products, product media,
  orders, payments, quizzes/questions/answers, AR experiences, reviews, about, retailers,
  scent personas.

- **FR-13 — Big-File Upload**: presigned **direct-to-object-storage** upload for `.glb` /
  `.apk` (currently Cloudflare R2; GCS after Phase 2) — bypasses Django to avoid proxying large
  files; finalize endpoint records the object key; delete endpoint removes object + clears the
  field. *(Current finalizer trusts the client key and is not admin-gated — see §8 #11.)*

---

## 4. Architecture & Data Flow

- React SPA → Django REST API (`/api/...`) over JSON; JWT in `Authorization: Bearer`.
- Images/small media: uploaded through Django to object storage (see §6 / storage plan).
- Large AR assets (`.glb`, `.apk`): browser requests presigned PUT URL → uploads directly
  to R2 → calls finalize to persist the key. Served via R2 public URL.
- Web AR: frontend fetches the AR record (`/api/ar/?product__name=`), loads A-Frame + MindAR
  from CDN, mounts the `.glb` against the `.mind` marker target.
- Admin dashboard stats are cached server-side (30 s).

---

## 5. Non-Functional Specifications (NFR) — **PROPOSED, pending approval**

- **NFR-1 Security**: JWT auth; HTTPS-only in production (`SECURE_SSL_REDIRECT`, secure
  cookies); CORS restricted to known origins in prod; no secrets in repo; compromised
  credentials rotated before redeploy.
- **NFR-2 Performance**: API read endpoints p95 < ~500 ms; admin dashboard served from
  cache; AR page interactive within a few seconds on mid-range mobile.
- **NFR-3 AR / Client Support**: web AR requires HTTPS + camera permission; targets current
  mobile Chrome and Safari; pinned A-Frame 1.5.0 + MindAR 1.2.3; Android native AR via APK.
- **NFR-4 Storage**: **single provider (Google Cloud Storage)** for all media; large files
  via signed-URL upload; served read via the GCS bucket (CDN-fronted in production).
- **NFR-5 Reliability**: stateless app container (gunicorn); managed Postgres (**Cloud SQL**
  target; Neon is current/legacy) with connection reuse (`conn_max_age=600`); cap Cloud Run
  max-instances against the Cloud SQL connection budget; deploys revertable via tags.
- **NFR-6 Maintainability**: phase-based development, hybrid tests, docs kept aligned
  (per `CLAUDE.md`).
- **NFR-7 Scalability**: gunicorn workers/threads configurable via env; DB connection pooling.

---

## 6. External Services & Configuration

Configured via environment variables (`server/backend/.env`, gitignored; shape in
`server/backend/.env.sample` — note: the sample is **incomplete**, currently only the Django
key + Google OAuth vars; expand it to cover DB, R2/GCS, Cloudinary, SendGrid, frontend).

| Service | Purpose | Key config | Target status |
|---|---|---|---|
| Cloud SQL (PostgreSQL) | Primary DB (target) | Cloud SQL connection / `DATABASE_URL` | **Target** — migrate from Neon |
| Neon (PostgreSQL) | Current DB | `DATABASE_URL` | Being replaced by Cloud SQL |
| Google Cloud Storage | **All media** (images + `.glb`/`.mind`/`.apk`) | bucket + service-account creds; signed URLs | **Target** — sole storage |
| Cloudflare R2 | Current big-file storage | `R2_*` | Being replaced by GCS |
| Cloudinary | Current image storage | `CLOUDINARY_*` | Being removed |
| SendGrid | Password-reset email | `SENDGRID_API_KEY`, `DEFAULT_FROM_EMAIL` | Retained |
| Google OAuth | Social login | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Retained |
| Secret Manager | Secret storage (prod) | — | **Target** — replaces `.env` |
| Frontend | API base | `REACT_APP_API_BASE_URL` | Retained |

Other settings: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`,
`CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, gunicorn tuning
(`GUNICORN_WORKERS/THREADS/TIMEOUT`, `PORT`), one-time `RUN_MIGRATIONS` / `RUN_COLLECTSTATIC`.

**All live secret values currently in `server/backend/.env` are considered compromised and
must be rotated before redeploy (see `CLAUDE.md` §8).**

---

## 7. Deployment

### 7.1 Previous deployment (deleted — payment lapse on Koyeb)
- **Backend**: Docker → Koyeb, gunicorn (`backend.wsgi`), whitenoise static.
- **Frontend**: React build → Vercel.
- **DB**: Neon Postgres. **Images**: Cloudinary. **Big files**: R2. **Email**: SendGrid.
  **OAuth**: Google.
- Terminated and removed; application code is intact, the live service is not.

### 7.2 Incoming deployment (planned) — **core infrastructure on Google Cloud Platform**
- **GCP project:** a **new dedicated project** (e.g. `eleganza-ar`) under the billing account
  holding the credit (credit is billing-account-level, so a new project keeps it); reuse the
  existing Google OAuth client from `fyp-login-system`.
- **Backend:** Cloud Run (Django container, gunicorn).
- **Database:** Cloud SQL (PostgreSQL), migrated from Neon.
- **Media:** single Google Cloud Storage bucket (Cloudinary + R2 removed; existing media
  migrated). Direct GCS URLs for the demo; Cloud CDN only if measured AR delivery warrants it.
- **Frontend:** Firebase Hosting (HTTPS — required for web AR).
- **Secrets:** Secret Manager; compromised credentials **rotated immediately** (all confirmed
  live 2026-06-21), not just before go-live.
- **Email / OAuth:** SendGrid (external) + Google OAuth retained — so this is *core infra* on
  GCP, not literally everything.
- Deploys revertable (tags per phase). Roadmap:
  `docs/superpowers/specs/2026-06-21-project-roadmap-design.md`.

---

## 8. Current State & Known Issues (from review)

Tracked so they become requirements/tasks; not yet fixed unless noted.

**Correctness / config**
1. **Web AR animation not playing** — `web/src/pages/ARViewer.js` loads only A-Frame + MindAR;
   the `<a-gltf-model>` has no `animation-mixer` and `aframe-extras` is never loaded, so
   embedded glTF clips never play. (Drives FR-3.1.) → Phase 1
2. **Dual storage** — Cloudinary + R2 → **GCS** (NFR-4). Storage is **bound per-field** in
   `server/shop/models.py`, so the migration needs field-storage + schema changes, not just a
   default-backend swap, plus a data-migration manifest. → Phase 2
3. **Dead config** — `web/src/config/api.js` (`REACT_APP_API_URL`) is **unused/not imported**;
   the live config is `web/src/lib/http.js` (`REACT_APP_API_BASE_URL`). Delete the dead file. → Phase 3
4. **Missing `MEDIA_URL` / `MEDIA_ROOT`** — referenced in `server/backend/urls.py` under DEBUG,
   not defined in `server/backend/settings.py`. → Phase 3
5. **`ProtectedRoute` loading flag** — reads `loading`; context exposes `loadingUser`; guard
   never triggers (can redirect a valid admin mid-load). → Phase 3
6. **Duplicate/overlapping auth routes** — `dj_rest_auth`/`allauth` registered under multiple
   prefixes across `server/backend/urls.py` and `server/shop/urls.py`; some paths shadow others. → Phase 3
7. **Test baseline broken** — `server/shop/tests.py` is an empty stub; `web/src/App.test.js`
   asserts CRA's deleted "learn react" UI and imports `http.js`, which **throws** when
   `REACT_APP_API_BASE_URL` is unset → the one frontend test fails. → Phase 3 (minimal CI)
8. **Checkout oversell + float money** — stock read/rewritten without row-lock/atomic update;
   totals accumulated as float (`server/shop/serializers.py` ~669). Use `select_for_update`/`F()`
   + `Decimal`. → Phase 3
9. **Quiz answers not scoped to their quiz** — answers from other quizzes can influence the
   result (`server/shop/views.py` ~669). → Phase 3

**Security (verified 2026-06-21 — Codex + code check)**
10. **Exposed secrets are LIVE** — Neon, R2, Cloudinary all reachable with the keys in
    `server/backend/.env` (verified). **Rotate immediately** (DB, R2, Cloudinary, Google OAuth
    secret, SendGrid, Django `SECRET_KEY`) — not "before redeploy". Then move to Secret Manager. → NOW
11. **Storage mutation open to any authenticated user** — `server/shop/views_upload.py`
    (presign/finalize/delete) use `IsAuthenticated`; finalizer trusts a client key without
    verifying the object. Must be **admin-only + verified**. → Phase 2
12. **AR delete endpoints open to any authenticated user** — `ARDeleteMarker/GLB/Mind`
    (`server/shop/views.py` ~903) set no `permission_classes` → default `IsAuthenticatedOrReadOnly`
    lets any signed-in user delete AR files. Must be **admin-only**. → Phase 2/3
13. **Split admin authority** — backend gates on `IsAdminUser` (`is_staff`); frontend on
    `user.role === "admin"`. Unify (decide: `role` implies `is_staff`, or `is_staff` is sole). → Phase 3
14. **Fail-open config** — `DEBUG` defaults `True`, `SECRET_KEY` defaults `"dev-only"` if env
    unset (`server/backend/settings.py:33,48`). Production must require them and abort if absent. → Phase 3
15. **Weak auth controls** — signup accepts 6-char passwords without Django validators; SendGrid
    reset accepts any non-empty password; no auth/reset throttling. → Phase 3
16. **Unvalidated review uploads** — type inferred from client MIME, no size/type allowlist
    (`server/shop/serializers.py` ~456) — riskier on a publicly served GCS bucket. → Phase 2/3
17. **Google login gaps** — no `email_verified` check; username collisions can error; raw
    verification exception text returned (`server/shop/social_views.py`). → Phase 3
18. **Token handling** — JWT in `localStorage`; 90-day refresh, not revoked on logout;
    unversioned CDN scripts (model-viewer, AR libs) without SRI. (Deferred hardening; mitigate
    by pinning/self-hosting scripts + CSP if cookies stay deferred.)

---

## 9. Conventions

- API base path: `/api/`. Admin API under `/api/admin/`.
- AR route: `/arview/:slug` where slug is the product name kebab-cased.
- Media served as absolute GCS URLs (post-consolidation).
- Conventional Commits; phases tagged `phase-<n>-<slug>`.
