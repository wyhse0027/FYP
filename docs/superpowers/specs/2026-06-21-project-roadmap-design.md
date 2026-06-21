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
- **Infrastructure:** All-in Google Cloud Platform (credit-funded, single provider).
- **AR:** Keep both delivery paths — in-browser web AR *and* the downloadable Android APK.
  The Unity project is maintained only to produce the `.apk` (stored as a binary).
- **Aesthetic:** Dark opulent × glass, motion-rich (see §5).

## 3. Target Architecture (demo-grade, all-in GCP)

| Layer | Choice | Notes |
|---|---|---|
| Backend | Cloud Run (Django container, gunicorn) | Already Dockerized; scales to zero |
| Database | Cloud SQL (PostgreSQL) | Migrated from Neon; removes cold-start latency |
| Media storage | Google Cloud Storage (single bucket) | Replaces **both** Cloudinary and R2; large files via signed URLs |
| Frontend | Firebase Hosting | SPA + CDN + free managed HTTPS (web AR requires HTTPS) |
| Secrets | Secret Manager | Replaces `.env`; compromised credentials rotated here |
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

### Phase 2 — Storage consolidated to GCS  `phase-2-storage-gcs`
- **Goal:** All media served from one GCS bucket; Cloudinary and R2 removed.
- **Outline:** switch django-storages default to GCS; port big-file presign
  (`views_upload.py`) to GCS signed URLs; migrate existing media to GCS.
- **Verification:** automated backend tests for upload/URL behavior; spot-check served assets.

### Phase 3 — Correctness & config hygiene  `phase-3-hygiene`
- **Goal:** Remove latent bugs and config inconsistencies; secure secrets.
- **Outline:** fix frontend env-var mismatch (drop stale `config/api.js`); fix
  `ProtectedRoute` `loading`→`loadingUser`; define/clean `MEDIA_URL`/`MEDIA_ROOT`;
  remove duplicate `dj_rest_auth`/`allauth` route registrations; move secrets to Secret
  Manager and **rotate the compromised credentials**.
- **Verification:** automated tests for affected backend paths; manual check of admin gating.

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

### Phase 7 — Core tests + light CI  `phase-7-tests-ci`
- **Goal:** Safety net for critical paths and an automated gate.
- **Outline:** `pytest` for critical backend paths (auth, orders, AR endpoints,
  permissions); minimal GitHub Actions running tests on PR. Demo-grade coverage, not
  exhaustive.
- **Verification:** CI green on a test PR.

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
