# progress.md — Development Log

Append-only log of phases, tasks, decisions, and test evidence. One entry per task
(see `CLAUDE.md` §7.2). Newest at top.

---

## Phase 2 — Task 7: Checksum-Manifest GCS Migration Command

**Date:** 2026-06-22
**Branch:** `phase-2-storage-gcs`
**Requirement refs:** NFR-4, context.md §8 #2
**Commit:** `489c166c`

- `manage.py migrate_media_to_gcs` with `--dry-run` (default) / `--execute --manifest` /
  `--rollback-manifest`. A hardcoded 13-entry `FIELD_MAP` (10 Cloudinary, 3 R2) — **all field
  names verified to exist on the real models** — drives inventory. Each source is streamed,
  MD5+byte-counted, uploaded under the **unchanged DB key**, then GCS metadata is reloaded and
  compared (`md5_hash` base64 + size). A differing destination collision raises before any
  upload/delete/DB change; a post-upload mismatch deletes the new generation and aborts; a
  matching object is `verified_existing` (idempotent). JSONL manifest rows
  (model/pk/field/provider/source-key/dest-key/bytes/md5/generation/status/timestamp) are
  fsync-flushed per row. `--rollback-manifest` deletes only `status=="copied"` generations and
  never initializes or touches Cloudinary/R2. boto3/Cloudinary/GCS imports are lazy. Added
  `migration-manifests/` to `.gitignore`.
- **Watch-item for Task 8:** verification relies on GCS `md5_hash`, which is absent for
  composite objects; single uploads (incl. the 417 MB APK) carry it, so it should hold.

**Test evidence (independently re-run):** `pytest shop/tests` → **60 passed** (run with
`--basetemp=/tmp/elzpt` to work around a sandbox temp-permission limit; default temp raised
WinError 5 in this environment only — not a code defect). `--help` exits 0 with all four modes.
FIELD_MAP field existence confirmed against the live models via Django introspection.

---

## Phase 2 — Tasks 5-6: Admin Upload Contract + Review Media Validation

**Date:** 2026-06-22
**Branch:** `phase-2-storage-gcs`
**Requirement refs:** FR-13, NFR-4, context.md §8 #16
**Commits:** `c132094a` (Task 5 SPA), `05d25d26` (Task 6 review validation)

- **Task 5** — `web/src/pages/admin/AdminAREditPage.js` now uses the provider-neutral
  contract: presign POST `/uploads/presign/` sends `kind/filename/content_type/size`,
  `uploadBigFile` returns `{key, upload_token}`, finalize PATCHes
  `/ar/<id>/finalize-bigfile/` with `kind/key/upload_token`. All visible "R2" text →
  "cloud storage"; create/edit flow preserved. Verified: 0 R2 refs remain; contract matches
  the Task 4 endpoints. Build: `CI=false npm run build` exit 0 (pre-existing unrelated lint
  warnings only).
- **Task 6** — added `validate_review_file()` + allowlists (`REVIEW_IMAGE_TYPES` jpeg/png/webp
  ≤10 MiB, `REVIEW_VIDEO_TYPES` mp4/webm ≤50 MiB, `REVIEW_MAX_FILES=5`) and a `validate_files`
  field-validator on `ReviewSerializer`. Validation runs during `is_valid()` and returns
  `(file, type)` tuples; `create()`/`update()` now persist the **validated** type instead of
  inferring from untrusted MIME. Empty, oversized, unsupported, extension/MIME-mismatch, and
  >5-file uploads are rejected before `ReviewMedia.objects.create()`. (Type is allowlist-based,
  not magic-byte sniffed; GCS serves objects with the stored validated content-type, so a
  mismatched-bytes file is still served as its declared image/video type — acceptable for
  demo-grade §8 #16.)

**Test evidence (independently re-run):** RED proved 8 invalid fixtures reached the old save
path; after the fix `pytest shop/tests` → **54 passed**; tests patch
`ReviewMedia.objects.create` and assert it stays uncalled for every rejected fixture. Frontend
build exit 0.

---

## Phase 2 — Tasks 3-4: Verified Admin-Only GCS Direct Uploads

**Date:** 2026-06-22
**Branch:** `phase-2-storage-gcs`
**Requirement refs:** FR-13, context.md §8 #11, #12
**Commits:** `7590baee` (Task 3 primitives), `e83e6d05` (Task 4 endpoints + authz)

- **Task 3** — `upload_policy.py` (frozen `UploadSpec`, glb/apk allowlists, `validate_upload`,
  salted `django.core.signing` claims, `max_age=900`) and `gcs.py` (`GCSGateway`:
  v4 signed PUT with `Content-Length`, `stat`, generation-guarded `delete`, `public_url`;
  immutable `StoredObject`). Pure units — no endpoints/live calls. 15 tests.
- **Task 4** — rewrote `views_upload.py` to GCS: `PresignBigFile` / `ARFinalizeBigFile` /
  `ARDeleteBigFile`, all `IsAdminUser`. Presign signs `{admin id, kind, key, size, MIME}`
  and returns `upload_url/public_url/key/upload_token`. Finalize loads the claim, binds it to
  the requesting admin + key-prefix, then `stat()`s the object and compares name/size/MIME;
  on mismatch it deletes the candidate by generation and leaves the DB untouched; success is
  replay-idempotent. Delete stats→generation-deletes→clears the field. Added
  `IsAdminUser` to legacy `ARDeleteMarker/GLB/Mind` views (§8 #12). Renamed
  `/uploads/r2-presign/` → `/uploads/presign/` (finalize/delete URLs unchanged). All R2/boto3
  code removed from `views_upload.py`. No live GCS call path under tests (gateway injected).

**Test evidence (independently re-run):** `pytest shop/tests` → **39 passed**. Authz matrix
(401 anon / 403 non-staff / admin) verified across all six endpoints; finalize cases (tamper,
expiry, cross-admin claim, missing object, size/type mismatch→generation-delete, idempotency,
key-outside-prefix) all covered. Confirmed `ARExperience.updated_at` exists and `permissions`
imported (no latent save/NameError).

---

## Phase 2 — Task 2: Repoint Default + Per-Field Storage to GCS

**Date:** 2026-06-22
**Branch:** `phase-2-storage-gcs`
**Requirement refs:** NFR-4, context.md §8 #2
**Commits:** `78956d6f` (storage), `671efb7c` (DB SSL fix)

- Default `STORAGES["default"]` → `storages.backends.gcloud.GoogleCloudStorage`
  (`querystring_auth=False`, `default_acl=None`, `file_overwrite=False`); legacy
  R2/Cloudinary settings left intact (Task 7 still needs source access).
- Removed the four explicit `storage=` bindings (and the Cloudinary/R2 imports +
  `r2_storage` instance) from `ARExperience` in `models.py`; `upload_to`/nullability/types
  unchanged. Migration `0032_alter_arexperience_storage_fields` is **AlterField-only**
  (state-only, reversible).
- Added shape-only `GCS_PROJECT_ID` / `GCS_BUCKET_NAME` / `GOOGLE_APPLICATION_CREDENTIALS`
  to `.env.sample`.
- **Blocker found + fixed (separate commit `671efb7c`):** `settings.py` passed
  `ssl_require=True` to `dj_database_url.parse()` for *every* scheme, so the disposable
  SQLite migration crashed (`sslmode` rejected by sqlite3). Made `ssl_require` conditional
  on a `postgres`/`postgresql` scheme — **Postgres (Neon) behavior unchanged** (verified
  `sslmode=require` still applied). Pre-existing bug, unblocks the plan's disposable-DB
  verification used in Tasks 2/9/10.

**Test evidence (independently re-run):** `pytest shop/tests` → 3 passed; disposable
`migrate` over `DATABASE_URL=sqlite:///…` applied 0001→**0032**→… exit 0; Postgres parse
check confirmed `engine=postgresql`, `sslmode=require`. Migration verified `AlterField`-only.

---

## Phase 2 — Task 1: Isolated Pytest Harness + GCS Deps + plan restoration

**Date:** 2026-06-22
**Branch:** `phase-2-storage-gcs`
**Requirement refs:** NFR-4, CLAUDE.md §5
**Commits:** `4d8b86e5` (harness), `911ec784` (plan restore + `.pytest_cache` ignore)

- Added `backend/settings_test.py` (in-memory SQLite, `InMemoryStorage`, fast hashers,
  locmem email), `pytest.ini`, and `shop/tests/` package with a sentinel harness test;
  pinned `google-cloud-storage==3.1.1`, `pytest==8.4.1`, `pytest-django==4.11.1` (only deps
  changed). RED (no pytest) → GREEN (1 passed) verified.
- **Plan remediation:** the committed Phase 2 plan (`360371cd`) had every line-final `t`
  stripped by a write glitch (0 `t`-ending lines). Codex restored them; verified **zero
  content drift** by proving that stripping one trailing `t` per line exactly reproduces the
  corrupted HEAD (1,106 lines, 24 `t`-ending lines restored). Folded `.pytest_cache/` into
  `.gitignore` (was untracked, surfaced during Task 1).

**Test evidence:** `pytest shop/tests/test_harness.py` → 1 passed; `manage.py check
--settings=backend.settings_test` → only 3 pre-existing allauth deprecations.

---

## Phase 2 — Task 0 GCP Storage Prerequisite Provisioned (owner-operated)

**Date:** 2026-06-22
**Requirement refs:** NFR-4, FR-13, context.md §8 #2/#11
**Task:** Owner completed the approved GCP project, billing, bucket, IAM, key, and CORS setup.

- Project `eleganza-ar` (`439528178601`) is ACTIVE and billing-enabled on the open
  `My Billing Account` billing account.
- Bucket `eleganza-ar-media-439528178601`: `ASIA-SOUTHEAST1`, `STANDARD`, regional,
  uniform bucket-level access enabled. Public access prevention is inherited (not enforced).
- Public-read decision applied: `allUsers` has bucket-level `roles/storage.objectViewer`.
- Scoped service account `eleganza-storage@eleganza-ar.iam.gserviceaccount.com` has
  bucket-level `roles/storage.objectAdmin`; its local JSON key is outside the repository.
- CORS origins: `http://localhost:3000`, `https://gerainchan.vercel.app`; methods
  GET/HEAD/PUT/DELETE; response headers Content-Type/Content-Length/ETag/x-goog-generation;
  max age 3600 seconds.
- Required Phase 2 APIs verified enabled: `storage.googleapis.com`, `iam.googleapis.com`,
  `iamcredentials.googleapis.com`.
- Complete enabled-service inventory at provisioning time: `analyticshub.googleapis.com`,
  `bigquery.googleapis.com`, `bigqueryconnection.googleapis.com`,
  `bigquerydatapolicy.googleapis.com`, `bigquerydatatransfer.googleapis.com`,
  `bigquerymigration.googleapis.com`, `bigqueryreservation.googleapis.com`,
  `bigquerystorage.googleapis.com`, `cloudapis.googleapis.com`, `cloudtrace.googleapis.com`,
  `dataform.googleapis.com`, `dataplex.googleapis.com`, `datastore.googleapis.com`,
  `iam.googleapis.com`, `iamcredentials.googleapis.com`, `logging.googleapis.com`,
  `monitoring.googleapis.com`, `servicemanagement.googleapis.com`,
  `serviceusage.googleapis.com`, `sql-component.googleapis.com`, `storage.googleapis.com`,
  `storage-api.googleapis.com`, `storage-component.googleapis.com`, and
  `telemetry.googleapis.com`. Only the three required APIs above were deliberately enabled
  during Task 0; the remainder were Google-managed/default services already enabled for the
  new project.
- Billing note: enabling an API does not by itself prove billable usage. The bucket currently
  has GCS soft delete enabled with a 7-day retention window, so deleted object bytes may remain
  billable during that window.

**Verification evidence:** project ACTIVE; billing enabled; bucket describe confirmed region,
class, uniform access, inherited public-access prevention, and 7-day soft delete; IAM policy
confirmed public viewer + scoped service-account object admin; CORS describe matched the
approved configuration; full enabled-service list captured.

**Gate:** Task 0 is complete. No Phase 2 branch or implementation starts until owner approval.

## Credential Rotation (owner-performed, verified)

**Date:** 2026-06-21
**Task:** Owner rotated the exposed credentials (Codex-guided); independently verified.

- Codex made **no file changes** (guidance only) — confirmed clean tree.
- Independent re-check (no secret values printed): **Neon PASS, R2 PASS, Cloudinary PASS,
  Django `SECRET_KEY` signing PASS, Google OAuth vars present.**
- **SendGrid expired** (free trial) → email delivery broken (new issue #19).
- Expanded `server/backend/.env.sample` to the full variable shape; marked SendGrid status in
  `context.md` §6; updated §8 #10 (rotated) + added #19 (email).

**Resolved (owner):** old credentials all deleted → exposure closed. Email → free
transactional provider (Brevo/Resend) in Phase 3.
**Still to verify:** Google OAuth server-side `/accounts/google/login/` callback works with the
new secret (the frontend id-token login only exercises the client_id).

**Test evidence:** liveness re-check all PASS; `manage.py` Django signing PASS.

---

## Codex Review Triaged + Resequence Adopted

**Date:** 2026-06-21
**Task:** Verified Codex's external review against the code; adopted its valid findings.

- **Credential liveness check (read-only):** Neon, R2, Cloudinary all **LIVE** with the stored
  keys → rotation elevated to **immediate** (owner action). Logged in `findings.md`.
- **Verified in code:** dead `web/src/config/api.js`; AR delete + upload endpoints not
  admin-gated (any authed user can mutate/delete storage); split admin authority
  (is_staff vs role); fail-open `DEBUG`/`SECRET_KEY`. Accepted (consistent): checkout
  race/float, password policy, review upload validation, quiz scoping, Google login gaps,
  token handling; per-field storage binding ⇒ Phase 2 needs field/schema migrations.
- **Decisions (owner):** GCP = new dedicated project `eleganza-ar` (reuse OAuth client);
  resequencing adopted; cloud data confirmed live.
- **Docs updated:** `context.md` §8 expanded (issues 1–18) + NFR-5/FR-13/§6/§7.2 corrections;
  roadmap Phase 2 (storage authz + upload hardening + per-field migration + manifest), Phase 3
  (security hardening + minimal CI before deploy), Phase 7 retitled; Phase 1 plan amended
  (pin CLI, loadScript race, AR query filter, metrics, keep old key); `task_plan.md`.

**Test evidence:** liveness check output (NEON/R2/CLOUDINARY all LIVE). Doc changes only.

---

## Repo Restructure (nested folders)

**Date:** 2026-06-21
**Branch/Tag:** `phase-restructure`
**Task:** Reorganized the repo to separate docs / code / config / assets into nested folders.

- Moved: backend + config → `server/`; frontend → `web/`; `eleganza_ar` → `ar-assets/`;
  `mindar_builder` → `tools/`; `arApp` + `fyp.apk` → `mobile/`; `media` + `db.sqlite3` →
  `server/`. Governance docs + planning files stay at root.
- 133 files moved as git **renames** (history preserved). Force-tracked the gitignored
  `web/public/models/eleganza/Eleganza_marker.mind` to avoid silently dropping it.
- Updated references: `context.md`, `CLAUDE.md`, `.gitignore`, Phase 1 plan paths. Docker
  build context becomes `server/` (noted for Phase 4).

**Test evidence:** `python server/manage.py check` → 0 errors (3 pre-existing allauth
deprecation warnings, unrelated). Frontend tree intact (`web/package.json`, `web/src/...`).

---

## Phase 1 — COMPLETE (web AR fix)

**Date:** 2026-06-21
**Branch/Tag:** `phase-1-web-ar`
**Requirement:** FR-3.1 (web AR renders + plays the model's animation).

- **Asset:** optimized the served model 413.9 MB → 11.5 MB (97%, Draco + WebP/1024,
  flatten/join disabled to avoid a quaternion regression); 36 clips / 67 channels / durations
  preserved. Uploaded a per-record optimized object; repointed PK1 + PK2 `model_glb`; **deleted**
  the two old 413 MB objects (~826 MB freed).
- **Code (`web/src/pages/ARViewer.js`):** load `aframe-extras@7.7.0`; Draco decoder
  (`dracoDecoderPath`); `animation-mixer="clip: *; loop: repeat"`; race-safe `loadScript`
  (+ remove failed tag on error — review finding); deliberate enabled-marker record selection.
- **Review:** per-phase review run; 1 low-severity finding (poisoned script tag on load failure)
  **fixed**.
- **Test evidence:** `npm run build` compiles; **manual AR (owner)** — model decodes (Draco OK),
  renders, and **animates** in-browser at the marker.
- **Deferred (owner):** animation "scatter" — Unity orchestrates via scripts/animators/particles
  not in the `.glb`; chosen fix is web clip curation (`loop: once`/subset). context.md §8 #20.

**Verification:** build PASS; manual AR PASS (renders + animates).

---

## Phase 1 — Plan Written

**Date:** 2026-06-21
**Task:** Wrote the Phase 1 (web AR fix) implementation plan; set up file-based planning.

- Planning files: `task_plan.md` (program tracker), `findings.md` (research).
- Plan doc: `docs/superpowers/plans/2026-06-21-phase-1-web-ar.md` — setup + 7 tasks, hybrid
  testing, branch `phase-1-web-ar` → tag.
- Verified: aframe-extras 7.7.0 (`animation-mixer`, A-Frame 1.5 compatible); `gltf-transform`
  optimize CLI (Draco + WebP/resize).
- Key risk flagged: must confirm the served web `.glb` contains animation clips (Task 1 gate).

**Test evidence:** N/A (planning).

---

## Roadmap Approved — Program Plan

**Date:** 2026-06-21
**Task:** Brainstormed and approved the overall improvement roadmap.

- Design doc: `docs/superpowers/specs/2026-06-21-project-roadmap-design.md`.
- Decisions: target = portfolio/demo-grade; infra = all-in GCP (Cloud Run + Cloud SQL + GCS
  + Firebase Hosting + Secret Manager); storage now **GCS** (supersedes earlier R2 plan);
  AR = keep web + APK; aesthetic = dark opulent × glass, motion-rich.
- 7 phases set: AR fix → GCS storage → hygiene → backend deploy → frontend deploy →
  luxury UI redesign → tests/CI. Per-phase specs are written when each phase begins.
- `context.md` reconciled to the GCP/GCS target.

**Test evidence:** N/A (planning + docs).

---

## Phase 0 — Baseline & Governance

**Date:** 2026-06-21
**Requirement ref:** governance setup (CLAUDE.md, context.md)
**Task:** Establish development harness and project specification.

- Created `CLAUDE.md` — binding process rules (no-assumption, requirement alignment,
  planning, phase/VCS workflow, hybrid testing gate, code review, doc alignment, security).
- Created `context.md` — functional specs (FR-1..FR-13), proposed non-functional specs
  (NFR-1..NFR-7), external services, deployment (previous + incoming), known issues.
- Created this log.

**Decisions captured (from owner):**
- AR: keep both web AR and APK; Unity maintained only to produce the `.apk`.
- Storage: consolidate to Cloudflare R2 only; **migrate** existing Cloudinary images.
  *(Superseded 2026-06-21 → consolidate to GCS, all-in GCP; see "Roadmap Approved" entry above.)*
- VCS: branch per phase + annotated tag on merge.
- Testing: hybrid — automated for backend logic, documented manual for UI/AR.
- Incoming deployment: same split shape, app host TBD.
  *(Superseded → all-in GCP: Cloud Run + Cloud SQL + GCS + Firebase Hosting.)*
- NFRs: derived defaults, marked proposed, pending approval.

**Test evidence:** N/A (docs only).

**Next planned phases (not started):**
- Phase 1 — Web AR animation fix (FR-3.1).
- Phase 2 — Storage consolidation to **GCS** + migrate existing media (NFR-4 / issue #2).
  *(was "R2"; superseded.)*
