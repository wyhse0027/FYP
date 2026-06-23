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
  - Password reset via Brevo HTTP API (request + confirm) with console/locmem fallback when unconfigured.
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

- **FR-13 — Big-File Upload**: presigned **direct-to-Google-Cloud-Storage** upload for `.glb` /
  `.apk` (Phase 2) — bypasses Django to avoid proxying large files; finalize endpoint verifies
  the uploaded object (size/type/generation) and records its key; delete endpoint removes the
  object (generation-guarded) + clears the field. Presign/finalize/delete are **admin-only**
  (§8 #11 resolved).

---

## 4. Architecture & Data Flow

- React SPA → Django REST API (`/api/...`) over JSON; JWT in `Authorization: Bearer`.
- Images/small media: uploaded through Django to object storage (see §6 / storage plan).
- Large AR assets (`.glb`, `.apk`): browser requests an admin-only presigned PUT URL → uploads
  directly to GCS → calls finalize (verifies the object) to persist the key. Served via the
  public GCS object URL.
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

Configured via environment variables (`server/backend/.env`, gitignored; the complete
variable shape is documented in `server/backend/.env.sample` without real values).

| Service | Purpose | Key config | Target status |
|---|---|---|---|
| Cloud SQL (PostgreSQL) | Primary DB (target) | Cloud SQL connection / `DATABASE_URL` | **Target** — migrate from Neon |
| Neon (PostgreSQL) | Current DB | `DATABASE_URL` | Being replaced by Cloud SQL |
| Google Cloud Storage | **All media** (images + `.glb`/`.mind`/`.apk`) | `GCS_PROJECT_ID`, `GCS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`; V4 signed URLs | **Done (Phase 2)** — sole media storage |
| Cloudflare R2 | (former big-file storage) | — | **Removed (Phase 2)**; `boto3` + `r2_storage.py` retained only as migration-0031 shim |
| Cloudinary | (former image storage) | — | **Removed (Phase 2)**; `cloudinary` pkg retained only as migration-0031 shim |
| Brevo | Password-reset / transactional email | `BREVO_API_KEY`, `DEFAULT_FROM_EMAIL` | **Active (Phase 3)** - HTTP API; console/locmem fallback when unconfigured |
| Google OAuth | Social login | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Retained |
| Secret Manager | Secret storage (prod) | — | **Target** — replaces `.env` |
| Frontend | API base | `REACT_APP_API_BASE_URL` | Retained |

Other settings: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`,
`CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, gunicorn tuning
(`GUNICORN_WORKERS/THREADS/TIMEOUT`, `PORT`), one-time `RUN_MIGRATIONS` / `RUN_COLLECTSTATIC`.

**The credentials exposed before 2026-06-21 were rotated and their old values revoked.
Future production values move to Secret Manager; `.env` remains local and gitignored
(see `CLAUDE.md` §8).**

---

## 7. Deployment

### 7.1 Previous deployment (deleted — payment lapse on Koyeb)
- **Backend**: Docker → Koyeb, gunicorn (`backend.wsgi`), whitenoise static.
- **Frontend**: React build → Vercel.
- **DB**: Neon Postgres. **Images**: Cloudinary. **Big files**: R2. **Email**: SendGrid.
  **OAuth**: Google.
- Terminated and removed; application code is intact, the live service is not.

### 7.2 Backend deployment (Phase 4 — LIVE 2026-06-23) — **core infrastructure on GCP**
- **GCP project:** `eleganza-ar` (number `439528178601`) on the credit-bearing billing account.
- **Backend:** Cloud Run service **`eleganza-api`** (`asia-southeast1`), image from Artifact
  Registry repo `eleganza-backend`, gunicorn/WhiteNoise. `min-instances=0`, `max-instances=4`,
  512Mi. Runtime SA **`eleganza-run@eleganza-ar.iam.gserviceaccount.com`** (least-privilege:
  `cloudsql.client`, bucket `objectAdmin`, `iam.serviceAccountTokenCreator` on itself).
  **URL: `https://eleganza-api-439528178601.asia-southeast1.run.app`**.
- **Database:** Cloud SQL **`elz-pg`** (PostgreSQL 17, ENTERPRISE edition, `db-f1-micro`, 10 GB,
  zonal, `asia-southeast1`), connected via the `/cloudsql` Unix socket (`--add-cloudsql-instances`).
  Data migrated from Neon (`pg_dump`/`pg_restore`, 35 tables/377 rows verified). **Neon kept as
  rollback.** Settings disable `sslmode` for the socket form.
- **Media:** the existing GCS bucket `eleganza-ar-media-439528178601`. **Signed uploads** use the
  attached SA via the **IAM signBlob** API (no key in the container; a cloud-platform-scoped token
  is fetched for signing) — verified live.
- **Frontend (Phase 5 — LIVE 2026-06-23):** React SPA on **Firebase Hosting**, project
  `eleganza-ar`, **`https://eleganza-ar.web.app`** (+ `…firebaseapp.com`). SPA rewrite to
  `/index.html`; static assets cached immutable, `index.html` no-cache. `REACT_APP_API_BASE_URL`
  baked at build (`web/.env.production`) → the Cloud Run API. Backend `CORS_ALLOWED_ORIGINS`,
  `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL` updated to the Firebase origins; Google OAuth client
  (`409741672143`) has both Firebase domains in Authorized JavaScript origins.
- **Secrets:** **Secret Manager** holds `DJANGO_SECRET_KEY`, `DATABASE_URL`, `BREVO_API_KEY`,
  `GOOGLE_OAUTH_CLIENT_SECRET`, granted to `eleganza-run@` per-secret and injected as Cloud Run
  secret env vars. Non-secret config (`DJANGO_DEBUG=False`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`,
  `GCS_*`, `GOOGLE_OAUTH_CLIENT_ID`) are plain env vars.
- **Email / OAuth:** Brevo HTTP API (Authorized-IP enforcement **deactivated for API keys** so the
  Cloud Run dynamic egress can send — no Cloud NAT). Google OAuth client lives in a separate
  project (`409741672143`); its frontend origins/redirects are set in Phase 5.
- **CORS/CSRF:** `CORS_ALLOWED_ORIGINS` is empty until the Phase 5 frontend origin exists;
  `CSRF_TRUSTED_ORIGINS` includes the Cloud Run host.
- Deploys revertable (Cloud Run revisions + per-phase tags). Roadmap:
  `docs/superpowers/specs/2026-06-21-project-roadmap-design.md`.

---

## 8. Current State & Known Issues (from review)

Tracked so they become requirements/tasks; not yet fixed unless noted.

**Correctness / config**
1. **Web AR animation — FIXED (Phase 1, 2026-06-21)** ✅ — added `aframe-extras` +
   `animation-mixer` + Draco decoder; optimized the model 413.9 MB → 11.5 MB; repointed both AR
   records; verified rendering + animating in-browser. FR-3.1 met. Remaining refinement: clip
   curation (see #20, deferred).
2. **Dual storage — RESOLVED (Phase 2)** ✅ — Cloudinary + R2 consolidated to a single **GCS**
   bucket (NFR-4). Default + per-field storage repointed (migration `0032`); all 46 existing
   media objects migrated with a checksum manifest (sources retained pending the Task 10 delete
   decision); legacy R2/Cloudinary runtime config removed (`boto3`/`cloudinary` pkgs +
   `r2_storage.py` kept only as a migration-0031 shim).
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
10. **Secrets rotated + old keys revoked (2026-06-21)** — Neon, R2, Cloudinary, Google OAuth
    secret, and Django `SECRET_KEY` rotated, re-verified working, and the **old credentials
    deleted** (owner confirmed) → exposure closed. Values move to Secret Manager at deploy. → DONE
19. **Email delivery broken - RESOLVED (Phase 3)** - SendGrid was retired after the
    free trial expired. Password reset now uses Brevo's HTTP transactional API when
    `BREVO_API_KEY` is configured, with Django console/locmem fallback when unconfigured;
    the `sendgrid` dependency was removed. Google OAuth callback hardening was verified in Task 6.
11. **Storage mutation authz — RESOLVED (Phase 2)** ✅ — `server/shop/views_upload.py`
    presign/finalize/delete are now `IsAdminUser`; finalize loads a signed claim bound to the
    requesting admin and verifies the stored object's key/size/type/generation before saving
    (mismatch deletes the candidate). Covered by automated API tests.
12. **AR delete endpoints authz — RESOLVED (Phase 2)** ✅ — `ARDeleteMarker/GLB/Mind`
    (`server/shop/views.py`) now set `permission_classes = [IsAdminUser]`; covered by automated
    permission tests (401 anon / 403 non-staff / admin).
13. **Split admin authority** — backend gates on `IsAdminUser` (`is_staff`); frontend on
    `user.role === "admin"`. Unify (decide: `role` implies `is_staff`, or `is_staff` is sole). → Phase 3
14. **Fail-open config** — `DEBUG` defaults `True`, `SECRET_KEY` defaults `"dev-only"` if env
    unset (`server/backend/settings.py:33,48`). Production must require them and abort if absent. → Phase 3
15. **Weak auth controls - RESOLVED (Phase 3)** - signup and password-reset confirm
    now run Django password validators; login/signup/reset routes are scoped-throttled.
16. **Review upload validation — RESOLVED (Phase 2)** ✅ — `ReviewSerializer.validate_files`
    enforces an image/video MIME+extension allowlist, per-type size caps (10/50 MiB), and a
    5-file limit before any `ReviewMedia` is created; the validated type (not client MIME) is
    persisted. Covered by automated tests.
17. **Google login gaps — RESOLVED (Phase 3)** ✅ — `social_views.py` requires `email_verified`,
    normalizes email lowercase + looks up `email__iexact`, handles username collisions
    deterministically (sha256 suffix) with an atomic create, and returns a generic error.
18. **Token handling — PARTIALLY RESOLVED (Phase 3)** — CDN scripts (A-Frame 1.5.0, MindAR 1.2.3,
    aframe-extras 7.7.0, model-viewer 4.3.1) are now **version-pinned with `sha384` SRI +
    `crossorigin`** (`ARViewer.js` dynamic loads + `index.html`). **Still deferred + tracked as
    security debt:** JWT in `localStorage` → httpOnly-cookie migration, refresh-token revocation
    on logout, and a Content-Security-Policy. (The Draco decoder at `gstatic.com/draco/v1/` is a
    WASM path loaded by GLTFLoader, not a `<script>` — SRI N/A; it's Google-hosted + versioned.)
20. **Web AR animation curation (DEFERRED)** — the web viewer plays all 36 glTF clips on
    independent loops (`clip: *; loop: repeat`), which desyncs ("scatter"). The APK looks
    coherent because Unity orchestrates via scripts/animator-states/particles (not in the
    `.glb`). FR-3.1 (render + animate) is met. Chosen future fix (owner): curate a subset /
    `loop: once`. Not now. See `findings.md` "Unity animation diagnosis".

---

## 9. Conventions

- API base path: `/api/`. Admin API under `/api/admin/`.
- AR route: `/arview/:slug` where slug is the product name kebab-cased.
- Media served as absolute GCS URLs (post-consolidation).
- Conventional Commits; phases tagged `phase-<n>-<slug>`.
