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
| Backend API | `backend/`, `shop/`, `manage.py` | Django 5.2, DRF, SimpleJWT | REST API, auth, admin, persistence |
| Web frontend | `ar-perfume-shop/` | React 19 (CRA) | Customer + admin SPA |
| Web AR | `ar-perfume-shop/src/pages/ARViewer.js`, assets in `eleganza_ar/`, `mindar_builder/` | MindAR 1.2.3 + A-Frame 1.5.0 | In-browser marker AR |
| Mobile AR | `arApp/` → `fyp.apk` | Unity | Native Android marker AR (download only) |

**Tracked in git:** `backend/`, `shop/`, `ar-perfume-shop/`, root Django files, these docs.
**Not tracked (local/artifact only):** `arApp/`, `media/`, `eleganza_ar/`, `mindar_builder/`,
`fyp.apk`, `db.sqlite3`.

The Unity project is **not actively developed** — it exists only to produce the `.apk`,
which is stored as a downloadable binary (R2).

---

## 3. Functional Specifications (FR)

Derived from code review of `shop/models.py`, `shop/views.py`, `shop/urls.py`, and the
React pages.

- **FR-1 — Authentication & Accounts**
  - Email/username + password signup and login (JWT access 30 min / refresh 90 d).
  - Google OAuth login via verified `id_token` (`shop/social_views.py`).
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

- **FR-13 — Big-File Upload**: presigned **direct-to-R2** upload for `.glb` / `.apk`
  (bypasses Django to avoid proxying large files); finalize endpoint records the object key;
  delete endpoint removes object + clears the field.

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
- **NFR-5 Reliability**: stateless app container (gunicorn); managed Postgres (Neon) with
  connection reuse (`conn_max_age=600`); deploys revertable via tags.
- **NFR-6 Maintainability**: phase-based development, hybrid tests, docs kept aligned
  (per `CLAUDE.md`).
- **NFR-7 Scalability**: gunicorn workers/threads configurable via env; DB connection pooling.

---

## 6. External Services & Configuration

Configured via environment variables (`backend/.env`, gitignored; shape in
`backend/.env.sample`).

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

**All live secret values currently in `backend/.env` are considered compromised and must be
rotated before redeploy (see `CLAUDE.md` §8).**

---

## 7. Deployment

### 7.1 Previous deployment (deleted — payment lapse on Koyeb)
- **Backend**: Docker → Koyeb, gunicorn (`backend.wsgi`), whitenoise static.
- **Frontend**: React build → Vercel.
- **DB**: Neon Postgres. **Images**: Cloudinary. **Big files**: R2. **Email**: SendGrid.
  **OAuth**: Google.
- Terminated and removed; application code is intact, the live service is not.

### 7.2 Incoming deployment (planned) — **all-in Google Cloud Platform**
- **Backend:** Cloud Run (Django container, gunicorn).
- **Database:** Cloud SQL (PostgreSQL), migrated from Neon.
- **Media:** single Google Cloud Storage bucket (Cloudinary + R2 removed; existing media migrated).
- **Frontend:** Firebase Hosting (HTTPS — required for web AR).
- **Secrets:** Secret Manager; compromised credentials rotated before go-live.
- **Email / OAuth:** SendGrid + Google OAuth retained.
- Deploys revertable (tags per phase). Roadmap:
  `docs/superpowers/specs/2026-06-21-project-roadmap-design.md`.

---

## 8. Current State & Known Issues (from review)

Tracked so they become requirements/tasks; not yet fixed unless noted.

1. **Web AR animation not playing** — `pages/ARViewer.js` loads only A-Frame + MindAR; the
   `<a-gltf-model>` has no `animation-mixer` and `aframe-extras` is never loaded, so embedded
   glTF clips never play. (Drives FR-3.1.)
2. **Dual storage** — Cloudinary (images) + R2 (big files). Consolidating to **GCS** (NFR-4);
   existing media to be migrated. (Supersedes the earlier interim R2-only plan.)
3. **Frontend env var inconsistency** — `config/api.js` uses `REACT_APP_API_URL` while
   `lib/http.js` / `ARViewer.js` use `REACT_APP_API_BASE_URL`. The former is likely stale.
4. **Missing `MEDIA_URL` / `MEDIA_ROOT`** — referenced in `backend/urls.py` under DEBUG but
   not defined in `settings.py` (local-dev crash risk).
5. **`ProtectedRoute` loading flag** — reads `loading` from auth context, which only exposes
   `loadingUser`; the loading guard never triggers.
6. **Duplicate route registrations** — `dj_rest_auth` / `allauth` / `accounts/` included in
   both `backend/urls.py` and `shop/urls.py`.
7. **No automated tests** — backend `tests.py` is the empty stub; frontend has only the
   default CRA test. (Test suite to be built per the hybrid standard.)
8. **Exposed secrets** in `backend/.env` — rotate before redeploy.

---

## 9. Conventions

- API base path: `/api/`. Admin API under `/api/admin/`.
- AR route: `/arview/:slug` where slug is the product name kebab-cased.
- Media served as absolute GCS URLs (post-consolidation).
- Conventional Commits; phases tagged `phase-<n>-<slug>`.
