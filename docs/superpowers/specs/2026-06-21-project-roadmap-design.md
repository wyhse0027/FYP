# Project Roadmap & Design — Eleganza / GERAIN CHAN

**Date:** 2026-06-21
**Status:** Approved (milestone reference). Per-phase detailed specs are written when each
phase begins, not upfront.
**Governs:** the overall improvement program. See [`CLAUDE.md`](../../../CLAUDE.md) for
process rules and [`context.md`](../../../context.md) for functional/non-functional specs.

---

## 1. Purpose

Bring a previously-deployed (Koyeb, now deleted) AR perfume e-commerce app back to a
**polished, reliably deployable, demo-grade** state — fixing what is broken, consolidating a
sprawling setup, and giving it a luxury visual identity — using the owner's Google Cloud
credit (~RM33k) to fund a clean, single-provider architecture.

This document sets the **milestones**. Each phase is detailed (requirements, design, tasks)
only when it is reached.

## 2. Scope Decisions (locked)

- **Quality target:** Portfolio / demo-grade. Make it work well, look premium, deploy
  reliably. Not a production commercial build.
- **Infrastructure:** Core infrastructure on Google Cloud Platform (credit-funded) — a **new
  dedicated project** (e.g. `eleganza-ar`) on the credit's billing account, reusing the
  existing OAuth client from `fyp-login-system`. SendGrid stays external.
- **AR:** Keep both delivery paths — in-browser web AR *and* the downloadable Android APK.
  The Unity project is maintained only to produce the `.apk` (stored as a binary).
- **Aesthetic:** Dark opulent × glass, motion-rich (see §5).

## 3. Target Architecture (demo-grade, core infra on GCP)

| Layer | Choice | Notes |
|---|---|---|
| Backend | Cloud Run (Django container, gunicorn) | Already Dockerized; scales to zero (still cold-starts) |
| Database | Cloud SQL (PostgreSQL) | Migrated from Neon; removes **Neon wake-latency** (not Cloud Run cold-start). Cap max-instances vs the connection budget |
| Media storage | Google Cloud Storage (single bucket) | Replaces **both** Cloudinary and R2; signed URLs. Direct GCS URLs for the demo; Cloud CDN only if measured AR delivery needs it (requires LB/backend-bucket) |
| Frontend | Firebase Hosting | SPA + CDN + free managed HTTPS (web AR requires HTTPS) |
| Secrets | Secret Manager | Replaces `.env`; compromised credentials (all confirmed **LIVE** 2026-06-21) rotated immediately |
| Cache / queue | Deferred | LocMemCache retained for demo; Redis/Memorystore only if needed |

This **supersedes** the earlier interim decision to consolidate storage on Cloudflare R2 —
storage now consolidates on **GCS** to stay single-provider and credit-funded.

## 4. Phased Milestones

Each phase = one `phase-<n>-<slug>` branch off `main` → task commits gated on passing tests
→ per-phase review → merge to `main` → annotated tag `phase-<n>-<slug>` (the revert point).
Definition of Done per task: code + test evidence + doc update + diff self-review
(see `CLAUDE.md`).

### Phase 1 — Web AR fixed & usable  `phase-1-web-ar`
- **Goal:** Web AR renders the product model **and plays its animation**, and actually
  loads on mobile.
- **Outline:** add `aframe-extras` + `animation-mixer` (FR-3.1); optimize the 413 MB `.glb`
  via `gltf-transform` (Draco/meshopt + texture downscaling) to single-digit MB.
- **Verification:** documented manual AR test (marker detection, model + animation, load time).
- **Why first:** highest-impact broken feature; infra-independent.

### Phase 2 — Storage consolidated to GCS + upload hardening  `phase-2-storage-gcs`
- **Goal:** All media on one GCS bucket; Cloudinary + R2 removed; uploads admin-gated and validated.
- **Outline:**
  - Repoint django-storages default to GCS **and the per-field storages in
    `server/shop/models.py`** (AR fields bind their own R2/Cloudinary storage) — includes
    field/schema migrations.
  - Port big-file presign (`views_upload.py`) to GCS signed URLs with CORS, scoped IAM,
    expiry, and size/type limits; finalize must **verify the object** (exists/size/type), not
    trust the client key; make presign/finalize/delete **admin-only**.
  - Data migration Cloudinary/R2 → GCS with a **manifest** (source key, dest key, checksum,
    rollback mapping).
- **Verification:** automated backend tests for upload auth + URL behavior; spot-check served
  assets; manifest reconciled.

### Phase 3 — Correctness, security hardening & minimal CI  `phase-3-hygiene`
- **Goal:** Close the verified correctness/security gaps and stand up a test/CI gate *before* deploy.
- **Outline:**
  - Config: delete dead `config/api.js`; fix `ProtectedRoute` `loading`→`loadingUser`;
    define/clean `MEDIA_URL`/`MEDIA_ROOT`; de-duplicate `dj_rest_auth`/`allauth` routes.
  - Security: fail-closed `DEBUG`/`SECRET_KEY` in prod; **unify admin authority**
    (role↔is_staff); admin-gate the AR delete endpoints; password validators + auth/reset
    throttling; Google login `email_verified` + safe errors; `Decimal` + `select_for_update`
    for checkout; scope quiz answers to their quiz.
  - **Minimal CI + test harness** (pytest for critical backend paths + a working frontend
    test; GitHub Actions on PR) — moved here, before deploy (resolves the `CLAUDE.md` §5.1
    vs deferred-tests contradiction).
- **Verification:** CI green; targeted tests for the security/permission fixes.

### Phase 4 — Backend live on Cloud Run + Cloud SQL  `phase-4-backend-deploy`
- **Goal:** API running on Cloud Run against Cloud SQL, configured for production.
- **Outline:** provision Cloud SQL, migrate Neon data; Cloud Run service wired to Cloud SQL
  + Secret Manager; ALLOWED_HOSTS / CORS / CSRF for the Cloud Run domain; static via
  whitenoise.
- **Verification:** deploy smoke tests (health, auth, a few read endpoints).

### Phase 5 — Frontend live on Firebase Hosting  `phase-5-frontend-deploy`
- **Goal:** SPA served over HTTPS, talking to the deployed API.
- **Outline:** build + deploy to Firebase Hosting; point `REACT_APP_API_BASE_URL` at Cloud
  Run; fix Google OAuth redirect URIs.
- **Verification:** end-to-end manual run — login, browse, cart/order, web AR, admin panel.

### Phase 6 — Luxury UI/UX redesign (user + admin)  `phase-6-ui-redesign`
- **Goal:** Elevate the look from "intermediate" to premium, consistently across user and
  admin surfaces. Flows unchanged — visual elevation + motion only.
- **Outline:** establish a design language (typography pairing, luxury palette + spacing,
  elevated components, motion/micro-interactions) and apply it across user pages (home,
  shop, product, quiz, cart/checkout, account) and admin (dashboard, tables, forms);
  responsive + accessible. Then redeploy the frontend.
- **Aesthetic:** dark opulent × glass, motion-rich (§5).
- **Process note:** at build time, use the frontend-design skill and present visual mockups
  for the owner to choose from before broad implementation.
- **Verification:** visual review across key screens on mobile + desktop.

### Phase 7 — Broaden test coverage  `phase-7-tests`
- **Goal:** Extend the Phase 3 CI baseline toward fuller coverage (minimal CI already landed
  in Phase 3).
- **Outline:** more `pytest` across endpoints/serializers/permissions; tidy the CI workflow.
  Demo-grade coverage, not exhaustive.
- **Verification:** CI green on the expanded suite.

## 5. Aesthetic Direction (Phase 6)

**Dark opulent × glass, motion-rich.** Deep dark base; gold/champagne accents; glassmorphic
surfaces with gradients and depth; rich animated transitions and micro-interactions
throughout. Builds on the existing Framer Motion + Tailwind stack. Concrete palette,
type pairing, and component mockups are decided at the start of Phase 6.

## 6. Deferred Backlog (explicitly out of demo scope — YAGNI)

Not now; revisit only if the project goal changes:

- Real payment gateway (payments stay simulated)
- Full TypeScript migration
- CRA → Vite migration
- Auth-library removal (keep the working SimpleJWT + dj-rest-auth + allauth stack; only
  de-duplicate routes in Phase 3)
- Backend god-module split (`views.py` / `serializers.py`)
- Redis/Memorystore cache + async email (Cloud Tasks)
- httpOnly-cookie JWT hardening
- Observability (Sentry / structured logging / monitoring)

## 7. Sequencing & Dependencies

- Phase 1 is independent (do first).
- Phases 2–3 are backend prerequisites for deploy.
- Phase 4 precedes Phase 5 (frontend needs the API URL).
- Phase 6 follows a working deploy (then a trivial frontend redeploy).
- Phase 7 can run last or alongside; CI is added once the app is stable.

Each phase is independently revertable via its tag. Per-phase specs and implementation
plans are produced when the phase begins.
