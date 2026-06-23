# Phase 4 — Backend Deploy (Cloud Run + Cloud SQL) — Implementation Plan

> **For executors:** infra-heavy phase. Owner-operated GCP steps (gcloud/console) are interleaved
> with code/config tasks. Each code task is test-first where testable; deploy/data steps have
> explicit owner checkpoints before any billable or live-data action. Halt-and-ask on ambiguity
> (`CLAUDE.md` §1). **Do not start until the owner approves this plan + the scope decisions.**

**Goal:** Deploy the Django backend to **Cloud Run**, backed by **Cloud SQL (PostgreSQL)**, with
production secrets in **Secret Manager** and media still on the existing GCS bucket — reachable at
a stable HTTPS URL the Phase 5 frontend will call.

**Branch:** `phase-4-backend-deploy` off `main` → annotated tag `phase-4-backend-deploy`.

**Prerequisite:** GCP project `eleganza-ar` (from Phase 2) with the billing credit. Reuses the
GCS bucket `eleganza-ar-media-439528178601` and SA `eleganza-storage@…`.

**Reuses existing scaffolding:** `server/Dockerfile` (gunicorn on `$PORT`, env-gated
migrate/collectstatic), `psycopg`/`gunicorn`/`whitenoise`/`dj-database-url` already pinned.

---

## Architecture (target)

```
Firebase (Phase 5) ──HTTPS──> Cloud Run (Django/gunicorn container)
                                   ├── Cloud SQL Postgres (private/unix-socket)   [replaces Neon]
                                   ├── Secret Manager (SECRET_KEY, DATABASE_URL, BREVO_API_KEY, OAuth)
                                   ├── GCS bucket (media) via ATTACHED service account (ADC)
                                   └── Brevo HTTP API (egress IP authorized)
```

---

## Locked scope decisions (owner-approved 2026-06-23)

1. **Data → Migrate Neon → Cloud SQL** (`pg_dump` → restore); Neon kept as rollback. (Task 4)
2. **Cloud SQL tier → smallest viable** — shared-core (`db-f1-micro`/`db-g1-small`), 10 GB SSD,
   single zone, `asia-southeast1`. ⚠ ~24/7 credit burn; consider stop/start between demos.
3. **Cloud Run min-instances → 0** (scale-to-zero; accepts cold starts).
4. **Secrets → Secret Manager** for `DJANGO_SECRET_KEY`, `DATABASE_URL`, `BREVO_API_KEY`,
   `GOOGLE_OAUTH_CLIENT_SECRET`; non-secret config as plain Cloud Run env vars.
5. **GCS signing → attached SA + IAM SignBlob** (no key in container); grant the runtime SA
   `roles/iam.serviceAccountTokenCreator` on itself. Verified live in Task 8 (fallback: key in
   Secret Manager).
6. **Brevo egress → static egress IP via Cloud NAT**, authorize that single IP in Brevo. (Task 7)
7. **Backend URL → the Cloud Run `*.run.app` URL** (no custom domain).

---

## Tasks

### Task 0 — GCP prerequisites (owner-operated)
- Enable APIs: `run`, `sqladmin`, `secretmanager`, `artifactregistry`, `cloudbuild`,
  `iamcredentials`. Create an **Artifact Registry** Docker repo in `asia-southeast1`.
- Decide the **runtime service account** (reuse `eleganza-storage@…` or a new `eleganza-run@…`);
  it needs: bucket `objectAdmin` (already), `secretmanager.secretAccessor`, `cloudsql.client`,
  and `iam.serviceAccountTokenCreator` on itself (for signed URLs).
- **Test:** `gcloud services list --enabled`; report identifiers. **Stop for owner confirmation.**

### Task 1 — Production settings + entrypoint hardening (code, test-first)
- **Files:** `server/backend/settings.py`, maybe `server/Dockerfile`, `server/backend/.env.sample`,
  tests `test_prod_settings.py`.
- Ensure under `DEBUG=False`: `ALLOWED_HOSTS` includes the Cloud Run host; `CSRF_TRUSTED_ORIGINS`
  + `CORS_ALLOWED_ORIGINS` include the frontend origin(s); `SECURE_*`/`SECURE_SSL_REDIRECT`
  already gated (verify they work behind Cloud Run's proxy — `SECURE_PROXY_SSL_HEADER` already
  set). Confirm `DATABASE_URL` parsing supports the Cloud SQL unix-socket form
  (`…?host=/cloudsql/PROJECT:REGION:INSTANCE`). Confirm static via WhiteNoise + `collectstatic`.
- Configure GCS to **omit the key** when `GOOGLE_APPLICATION_CREDENTIALS` is unset (ADC) — confirm
  `GoogleCloudStorage` works with ADC; ensure signed URLs use the attached SA.
- **Test:** settings assertions for prod (hosts/CORS/SSL); `manage.py check --deploy` triaged.

### Task 2 — Cloud SQL instance (owner-operated)
- Create the Postgres instance (approved tier/region), a database + app user; note the connection
  name `PROJECT:REGION:INSTANCE`. **Stop for owner confirmation** (billable, ~24/7).

### Task 3 — Secret Manager (owner-operated + code)
- Create secrets for the approved set; grant the runtime SA `secretAccessor`. Map them into Cloud
  Run as secret-backed env vars (Task 6). Document names in `.env.sample`/`context.md`.

### Task 4 — Data migration Neon → Cloud SQL (owner checkpoint before write)
- `pg_dump` the Neon DB → restore into Cloud SQL (via Cloud SQL Auth Proxy locally). Verify row
  counts + key tables (users, products, ARExperience, orders). **Owner approves before the live
  restore.** Keep Neon intact as rollback.

### Task 5 — Build + push image (Artifact Registry)
- Build `server/Dockerfile` via **Cloud Build** → push to Artifact Registry. Confirm the image
  runs (`PORT`, gunicorn). No secrets baked in.

### Task 6 — Deploy to Cloud Run (owner-operated + code)
- Deploy the image with: attached runtime SA, `--add-cloudsql-instances`, env (DEBUG=False,
  ALLOWED_HOSTS, CORS/CSRF, GCS_*), Secret Manager-backed secrets, `min-instances` (approved),
  sane `max-instances` (capped vs Cloud SQL connections), `RUN_MIGRATIONS=1` for the first deploy
  (or a one-off migrate job). Capture the `*.run.app` URL.

### Task 7 — Post-deploy wiring (owner-operated)
- Authorize the Cloud Run egress IP in **Brevo** (or relax per decision #6). Update **Google OAuth**
  authorized origins/redirects for the new backend URL. Set the frontend's `REACT_APP_API_BASE_URL`
  target (used in Phase 5).

### Task 8 — Live smoke test (owner + Claude where possible)
- Verify: `/api/products/` and `/api/ar/?...` return data from Cloud SQL; admin login (JWT);
  **GCS signed upload** (presign→PUT→finalize) works with the attached-SA signing; a password
  reset email sends via Brevo; web AR loads assets. Record evidence in `progress.md`.

### Task 9 — Review, docs, merge + tag
- `/code-review` + `/security-review` (Cloud Run IAM, Secret Manager, public exposure, SSL,
  signed-URL signing). Update `context.md` §7 (deployment), `docs/services-and-billing.md`
  (Cloud Run + Cloud SQL now active, credit draw), `task_plan.md`. Owner approves → merge `--no-ff`
  → tag `phase-4-backend-deploy` → push.

---

## Risks / watch
- **Credit burn:** Cloud SQL ~24/7 is the main ongoing cost — smallest tier; consider stop/start
  when not demoing. Budget alert on the billing account (per services doc).
- **Signed URLs on Cloud Run:** the no-key SignBlob path is the trickiest bit — Task 8 must prove
  it; fallback is a key in Secret Manager.
- **Cold starts** with min-instances=0 (acceptable for a demo).
- **CORS/CSRF**: the prod origins must be set or the Phase 5 frontend breaks (the Phase 3 local-dev
  CORS lesson applies — prod uses `CORS_ALLOWED_ORIGINS`, not allow-all).

## Self-review
- Reuses the existing Dockerfile; no new app dependencies expected (psycopg/gunicorn present).
- Every billable/live-data step (Cloud SQL create, data restore, deploy) has an owner checkpoint.
- Rollback: Neon kept until Task 9; Cloud Run revisions are revertable; phase tag for the boundary.
