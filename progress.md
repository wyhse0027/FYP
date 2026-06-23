# progress.md — Development Log

Append-only log of phases, tasks, decisions, and test evidence. One entry per task
(see `CLAUDE.md` §7.2). Newest at top.

---

## Phase 4 — Plan Written (approved)

**Date:** 2026-06-23
**Task:** Wrote `docs/superpowers/plans/2026-06-23-phase-4-backend-deploy.md` (10 tasks): Cloud
Run + Cloud SQL deploy, Secret Manager, Neon→Cloud SQL data migration, reusing the existing
`server/Dockerfile`. Owner checkpoints before every billable/live-data step.

**Locked decisions (owner):** migrate Neon→Cloud SQL (Neon kept as rollback); smallest Cloud SQL
tier (shared-core, `asia-southeast1`, ~24/7 — consider stop/start); Cloud Run min-instances=0
(scale-to-zero); secrets in **Secret Manager**; GCS signed URLs via **attached SA + IAM SignBlob**
(no key in container); Brevo egress via **static IP (Cloud NAT)** authorized in Brevo; backend on
the `*.run.app` URL (no custom domain).

**Key risks flagged:** Cloud SQL ~24/7 credit burn (budget alert); no-key SignBlob signing must be
proven live (Task 8); prod CORS/CSRF origins must be set (the Phase 3 local-dev CORS lesson).

**Test evidence:** N/A (planning). Execution not started; branch `phase-4-backend-deploy` to be
created off `main` at Task 0.

---

## Phase 3 — Task 11: review, merge + tag — PHASE COMPLETE

**Date:** 2026-06-22
**Branch/Tag:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #3-9,#13-19; CLAUDE.md §6

- **Formal review (inline):** code review = no outstanding correctness issues (the one cross-task
  bug, migration-0031 cloudinary config in clean envs, was caught by the new CI and fixed).
  Security review = fail-closed `DEBUG`/`SECRET_KEY`, password validators on all set-password
  paths, per-IP auth throttling, `is_staff` sole admin authority (no role escalation), hardened
  Google login, canonicalized routes, Brevo key in gitignored `.env`, SRI on CDN scripts; **no
  secrets in git**. Deferred + tracked (§8 #18): cookie migration, CSP, refresh-token revocation,
  cross-instance throttle storage.
- **Verification:** GitHub Actions CI **green** (backend + frontend); fresh clean-env migrate
  `0001→0034` no errors; secret scan clean (`.env` gitignored; only test-fixture passwords).
- **Owner approved merge.** Merged `phase-3-hygiene` → `main` (`--no-ff`), annotated tag
  `phase-3-hygiene`, pushed.

**Phase 3 COMPLETE.** Resolved §8: #3,#4,#5,#6,#7,#8,#9,#13,#14,#15,#16(P2),#17,#19; #18 partial
(SRI/pinning done, rest tracked). **Next: Phase 4 — backend deploy (Cloud Run + Cloud SQL).**

---

## Phase 3 — Task 10: minimal CI (executed by Claude; Codex out of tokens)

**Date:** 2026-06-22
**Branch:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #7 (CI)
**Commits:** `731fc42e` (workflow), `<cloudinary shim>` (CI-caught fix)

- Added `.github/workflows/ci.yml`: **backend** job (Python 3.13, `pip install`, `pytest shop/tests`
  under `settings_test` — in-memory sqlite/InMemoryStorage/locmem, no live services) and
  **frontend** job (Node 20, `npm ci`, `npm test --watchAll=false`, `npm run build`). Triggers on
  push + PR.
- **CI caught a real latent bug** (passes locally only because the local `.env` still has Cloudinary
  vars): migration `0031` instantiates `cloudinary_storage.MediaCloudinaryStorage`, which raises
  unless `CLOUD_NAME/API_KEY/API_SECRET` are present — so `migrate` `KeyError`'d in CI (and would
  on a fresh Cloud Run deploy). **Fixed:** added a dummy `CLOUDINARY_STORAGE` migration-compat shim
  to base settings (parallel to `r2_storage.py`; env-overridable, never used at runtime). Verified
  `MediaCloudinaryStorage` instantiates with the dummy dict and no env.
- **Verified on GitHub Actions: both jobs GREEN** (backend 30s, frontend 51s).

**Test evidence:** GitHub Actions run `27999995031` — Backend + Frontend both ✓; local clean-env
isolation test passed; local suite 96 passed.

---

## Phase 3 — Task 9: CDN pinning + SRI (executed by Claude; Codex out of tokens)

**Date:** 2026-06-22
**Branch:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #18 (partial)
**Commit:** `4dd43a04`

- Pinned **model-viewer → `@4.3.1`** (was unversioned/mutable — the core #18 risk) and added
  `sha384` SRI + `crossorigin="anonymous"` to it and the AR libs (A-Frame 1.5.0, MindAR 1.2.3,
  aframe-extras 7.7.0). `ARViewer.js` `loadScript` now sets `integrity`/`crossOrigin` **before**
  `src`. Hashes computed from the exact files (all origins serve `ACAO: *`) and verified
  deterministic (identity == compressed). Draco decoder path left (WASM via GLTFLoader, SRI N/A).
  CSP + cookie migration + refresh-token revocation explicitly **deferred + tracked** in §8 #18;
  #17 also marked resolved.
- **Manual gate PASSED (owner):** web AR renders + animates with SRI active; no SRI console
  errors; build exit 0.

**Local-dev finding (from the manual test):** Task 1's `DEBUG` default→False means a local
`.env` **must set `DJANGO_DEBUG=True`** (already in `.env.sample`), otherwise `DEBUG=False`
locally flips `CORS_ALLOW_ALL_ORIGINS=False` + `SECURE_SSL_REDIRECT=True` and blocks every
`localhost:3000` API call (CORS). Owner added `DJANGO_DEBUG=True` to local `.env` → resolved.
(No code change — correct fail-closed prod behavior; documented in `.env.sample`.)

**Test evidence:** SRI hashes verified deterministic; `npm run build` exit 0; owner manual AR
render+animate PASS.

---

## Phase 3 — Task 8: frontend hygiene + Task 5 follow-ups

**Date:** 2026-06-22
**Branch:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #3, #5, #7 (frontend), #13 follow-ups
**Commits:** `ce282955` (dead config + route guard + test), `d1a2fa03` (admin badge),
`5e2ed452` (reverse backfill migration)

- **#3:** deleted unused `web/src/config/api.js` (nothing imports it; live config is
  `web/src/lib/http.js`).
- **#5:** `ProtectedRoute.js` now reads `loadingUser` (the real `AuthContext` flag) instead of
  the never-defined `loading`, so a valid admin isn't redirected mid-profile-load.
- **#7 (frontend):** replaced the stale CRA `App.test.js` (asserted deleted "learn react" UI +
  threw on unset API base) with 2 meaningful tests (route shell renders; protected routes wait
  while loading).
- **Task 5 follow-ups:** `AdminUsersPage.js` badge now keys on `is_staff`; migration `0034`
  reverse-backfills `is_staff=True`/`role=user` → `role="admin"` (with 0033, every user's
  `role` ⟺ `is_staff` is now consistent).

**Inspection:** backend **96 passed**; Jest `App.test.js` **2 passed** (run independently);
fresh sqlite migrate applies 0033+0034; `makemigrations --check` = no drift; `npm run build`
exit 0; confirmed `ProtectedRoute`'s `loadingUser` matches the `AuthContext` export and
`config/api.js` is gone with no importers.

**Test evidence:** RED→GREEN (Jest); full backend suite 96 passed; build exit 0.

---

## Phase 3 — Task 7: transactional email via Brevo HTTP API

**Date:** 2026-06-22
**Branch:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #19
**Commit:** `0fccf2ac`

- Replaced SendGrid with **Brevo's HTTP transactional API**. `email_service.send_transactional_email()`
  POSTs to `api.brevo.com/v3/smtp/email` (stdlib `urllib`, no new dep) when `BREVO_API_KEY` is set,
  else falls back to Django's `send_mail` (console in dev, locmem in tests) so CI never sends.
  Password-reset views now call it; `sendgrid` dependency removed; `.env.sample` + `context.md`
  updated (§8 #19 resolved). **Decision (owner):** Brevo over **HTTP API** not SMTP, because
  Brevo enforces account-level **Authorized IPs** (SMTP 525 + API 401 from an unrecognized IP);
  the HTTP API is the path that works from Cloud Run's dynamic egress IP (still IP-gated, so the
  egress IP must be authorized at deploy — tracked in `docs/services-and-billing.md`).
- **Live proof (Claude, owner-authorized):** real send via the Brevo HTTP API returned **HTTP 201**
  with a `messageId` after the owner authorized the sending IP `60.53.186.250` in Brevo Security.

**Inspection:** 96 passed; reset view calls `send_transactional_email`; tests make **no live
call** (fallback patches `urlopen`→`call_count==0` + locmem outbox; Brevo path mocks `urlopen`
and asserts the exact payload/headers); no residual `sendgrid` in committed code; tests use the
pytest-django `settings` fixture (auto-restored — no settings leak). **Note:** the owner's local
`.env` still held the dead `SENDGRID_API_KEY` (expired trial) — to be deleted locally (not
committed; nothing reads it).

**Test evidence:** RED 2-fail → GREEN 2 pass; full suite **96 passed**; live Brevo API 201.

---

## Phase 3 — Task 6: route canonicalization + Google login hardening

**Date:** 2026-06-22
**Branch:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #6, #17
**Commits:** `9e58c9cc` (routes), `2617a553` (Google login)

- **Routes (#6):** collapsed duplicate auth/login/reset/token routes to one canonical set and
  removed the dead shadowed unthrottled `/api/token/` (Task 2 finding) plus duplicate
  `dj-rest-auth`/`registration`/`accounts` mounts. Survivors: `/api/token/` (throttled
  `MyTokenObtainPairView`), `/api/token/refresh/`, `/api/signup/`, `/api/auth/login/`,
  `/api/auth/password-reset/` + `-confirm/` (SendGrid views, keep Task 2 throttles + validators),
  `/api/auth/google/` (`GoogleLoginView`), `/accounts/` (allauth — server-side OAuth callback
  preserved). **No frontend source change needed** — all callers already pointed at survivors.
- **Google login (#17):** require `email_verified`; normalize email lowercase + look up
  `email__iexact`; deterministic username-collision handling (sha256 suffix); atomic create with
  `IntegrityError` re-query for the race; generic error body (no raw provider text leaked).

**Careful/detailed inspection (owner-requested, riskiest task):** `manage.py check` clean (no
broken imports/URLs); **94 passed**; every surviving route resolved to the correct view;
`/accounts/google/login/` still resolves (OAuth callback intact); full frontend endpoint-caller
grep confirmed **zero** calls to any removed route; Google test mock target
(`shop.social_views.id_token`) valid; frontend build exit 0. **Manual check deferred to Task 11:**
real Google Sign-In in the browser (token verification is mocked in unit tests). **Leftover (note):**
`/api/auth/login/` (`ThrottledLoginView`) is unused by the frontend now (login goes via
`/api/token/`) — harmless + throttled, left in place.

**Test evidence:** RED 9-fail → GREEN 11 pass; full suite **94 passed**; routes resolve/404 as
expected.

---

## Phase 3 — Task 5: unify admin authority on is_staff

**Date:** 2026-06-22
**Branch:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #13
**Commit:** `52a94693`

- `is_staff` is now the **sole** admin authority. `User.save()` mirrors `role` from `is_staff`
  (`role = ADMIN if is_staff else USER`), so writing `role="admin"` alone no longer promotes.
  One-time data migration `0033` backfills existing `role=="admin"` users to `is_staff=True`.
  `UserSerializer` exposes `is_staff` **read-only**; token + Google login responses include it;
  frontend admin routing/nav/login redirect now check `user?.is_staff === true`.

**Penetration inspection (owner-requested):** escalation surface **clean** — no writable
`is_staff`/`role` in any serializer; signup fields are only id/username/email/password (no
self-promotion); no dead `user.role =` promotion code. Invariant verified: a `role=admin` /
`is_staff=False` user is forced to `role=user` and gets **403** on the admin API. 83 passed;
`makemigrations --check` = no drift; fresh migrate applies 0033. **Two cosmetic, non-security
gaps deferred to Task 8** (role now faithfully mirrors is_staff so both are display-only):
(1) migration is one-directional — a pre-existing superuser (`is_staff=True`/`role=user`) keeps
`role=user` until next save (still admin everywhere that matters; self-heals); a reverse
backfill would tidy this. (2) `web/src/pages/admin/AdminUsersPage.js:144` still uses
`role === "admin"` for a badge colour inside an admin-gated page.

**Test evidence:** RED 3-fail → GREEN 4 pass; full suite **83 passed**; fresh migrate 0001→0033.

---

## Phase 3 — Task 2: password validators + scoped auth throttling

**Date:** 2026-06-22
**Branch:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #15
**Commit:** `5e8740ec`

- **Validators:** `AUTH_PASSWORD_VALIDATORS` (MinimumLength 8, CommonPassword, NumericPassword,
  UserAttributeSimilarity) now enforced via `validate_password()` on **all three** password-set
  paths — signup (`UserSignupSerializer.validate`), the SendGrid reset-confirm view, and the
  serializer-based reset-confirm.
- **Throttling:** DRF `ScopedRateThrottle` with scoped rates — login `5/min` (`/api/token/` +
  `/api/auth/login/` via new `ThrottledLoginView`), signup `5/min`, reset-request `3/min`,
  reset-confirm `3/min`. Global default is `ScopedRateThrottle` (no-op for unscoped views).
  LocMem = per-process/per-instance under Cloud Run (shared enforcement deferred to deploy).
- **Test isolation (added during review):** `server/shop/tests/conftest.py` autouse cache-clear
  so DRF throttle counters never leak between tests.

**Penetration inspection (owner-requested, re-grabbed task):** challenged and verified —
validators reject common/weak + accept strong on signup *and* reset-confirm; `/api/token/`
resolves to the **throttled** `MyTokenObtainPairView` (shop include precedes the base route, so
the throttle is live — confirmed by 429); global throttle doesn't affect product/AR endpoints;
suite deterministic (79 passed ×2); `manage.py check` clean. **Finding flagged for Task 6:**
`backend/urls.py:21` registers a **dead, shadowed, unthrottled** `/api/token/`
(base `TokenObtainPairView`, duplicate `name="token_obtain_pair"`) — harmless now but a
throttle-bypass footgun; Task 6 must remove it during route canonicalization.

**Test evidence:** RED 6-fail → GREEN 9 pass; full suite **79 passed** (×2 deterministic).

---

## Phase 3 — Tasks 1, 3, 4: config safety, atomic checkout, quiz scoping

**Date:** 2026-06-22
**Branch:** `phase-3-hygiene`
**Requirement refs:** context.md §8 #14, #4, #8, #9 (+ folded qty guard)
**Commits:** `e41aaa73` (config), `56b47c6a` (checkout atomic/Decimal), `e77a757b` (quiz),
`2c92c271` (order-item qty ≥ 1)

- **Task 1 (#14, #4):** fixed `settings.py` env load-order (project `.env` now loads **before**
  `DEBUG`/`SECRET_KEY`); `DEBUG` defaults False; prod **requires** a real `DJANGO_SECRET_KEY`
  (raises `ImproperlyConfigured` on unset/`dev-only`); defined `MEDIA_URL`/`MEDIA_ROOT`.
  `settings_test.py` opts into dev mode before importing base so the guard is skipped under tests.
- **Task 3 (#8):** Order create wrapped in `transaction.atomic` + `select_for_update()` with a
  fresh re-query + per-product quantity aggregation (also closes the same-product-multi-line
  oversell), `F()` stock decrement, `Decimal` totals (quantized). Response shape unchanged.
- **Task 4 (#9 + folded):** quiz scoring filters answers by `question__quiz=<submitted quiz>`
  (foreign answers can't influence the result); `OrderItemSerializer.quantity` now
  `IntegerField(min_value=1)` (rejects 0-qty items).

**Deep integration inspection (owner-requested):** full suite **70 passed** (Phase 2 storage +
Phase 3 together); `manage.py check` (local `.env`) starts clean; fresh sqlite migrate 0001→0032
clean; `makemigrations --check` = no drift. Penetration notes: price/total read-only
(no client manipulation), oversell + negative qty blocked, no parallel order path bypasses the
fix. Non-blocking observation logged: the PDF **receipt** renders the stored Decimal total via
`float()` for `:.2f` display only (no money-integrity impact).

**Test evidence:** RED→GREEN for each task; full suite 70 passed (`--basetemp=/tmp/elzpt`).

---

## Phase 3 — Plan Written + Reviewed (approved)

**Date:** 2026-06-22
**Task:** Wrote `docs/superpowers/plans/2026-06-22-phase-3-hygiene.md` (11 tasks → context.md
§8 items + minimal CI + email). Codex independently reviewed Phase 2-as-merged (no code/security
defects; 60 tests + fresh sqlite migrate re-passed) and the Phase 3 plan.

- **Codex Phase 2 doc-drift findings (verified + fixed here):** `CLAUDE.md` §9.2 still called R2
  the current backend; `context.md` deploy §7.2 still implied pending rotation. Both corrected.
- **Plan amendments accepted (Codex review):** Task 1 must fix the env load-order
  (`settings.py` reads `DEBUG` at L31 *before* loading `server/backend/.env` at L35) before
  defaulting `DEBUG=False`; admin authority via one-time backfill + read-only `is_staff` (NO
  auto-elevate on `role` save); canonicalize duplicate auth/reset routes (Task 6) **before** the
  email swap (Task 7); Google login = normalized case-insensitive email identity + race handling;
  CI runs the repaired Jest test (not just build); SRI set before `src` on dynamically-injected
  AR scripts.
- **Owner decisions:** email = **Brevo** (no custom domain); `is_staff` sole admin authority
  (amended mechanics); throttles 5/min login+signup, 3/min reset request+confirm; defer
  cookie-migration + CSP + refresh-token revocation as tracked security debt.

**Test evidence:** N/A (planning + doc reconciliation). Plan committed; execution not started.

---

## Phase 2 — Task 10: Review, Source Decision, Merge + Tag — PHASE COMPLETE

**Date:** 2026-06-22
**Branch/Tag:** `phase-2-storage-gcs`
**Requirement refs:** NFR-4, FR-13, §8 #2/#11/#12/#16; CLAUDE.md §6

- **Fresh verification:** `pytest shop/tests` → 60 passed; `manage.py check` → only 3
  pre-existing allauth deprecations; fresh sqlite migrate 0001→0032 clean; `npm run build`
  compiles; `git diff --check main...HEAD` clean (19 commits).
- **Formal code review** (holistic, branch vs main): 1 finding — the retained migration command
  read `AWS_*`/Cloudinary settings removed in Task 9 (opaque `AttributeError` on a future
  `--execute`). **Fixed** (`4a4ece89`): clear `CommandError` guards. Accepted/low (by design):
  admin-only generation race on delete/finalize; migrated objects served `octet-stream`
  (no videos; images sniff-render); octet-stream in the GLB/APK allowlist (admin-only).
- **Formal security review** (storage creds/presign/CORS/permissions): no findings. SA scoped to
  bucket-level `objectAdmin`; public bucket is media-only (no secrets/manifests/keys); signed
  claims bound to admin+key with 15-min expiry + tamper detection; all 6 endpoints `IsAdminUser`
  + object-verified; `.env`/signer key/manifests gitignored or out-of-repo.
- **Owner decisions:** (1) **Keep** legacy R2/Cloudinary source objects as the rollback safety
  net (deletion deferred; R2 6 obj/819 MiB + Cloudinary 40 obj/32 MiB). (2) **Merge + tag now.**
- Merged `phase-2-storage-gcs` → `main` (`--no-ff`), annotated tag `phase-2-storage-gcs`, pushed.

**Phase 2 COMPLETE.**

---

## Phase 2 — Task 9: Retire Active Legacy Storage Config + Doc Alignment

**Date:** 2026-06-22
**Branch:** `phase-2-storage-gcs`
**Requirement refs:** NFR-4, context.md §8 #2

- Removed all active Cloudinary/R2 runtime config from `settings.py` (`import cloudinary`, the
  `cloudinary`/`cloudinary_storage` INSTALLED_APPS entries, `cloudinary.config()`, and the entire
  `R2_*`/`AWS_S3_*` block) and their shape vars from `.env.sample`; updated two `models.py`
  comments. Rewrote `backend/r2_storage.py` into a **settings-free migration-compat shim**
  (was reading `settings.AWS_S3_CUSTOM_DOMAIN` at class-def, which would break fresh migrate).
- **Retained** (per plan): `boto3`/`botocore`/`s3transfer`/`cloudinary`/`django-cloudinary-storage`
  in `requirements.txt`, `r2_storage.py`, and the migration command — historical migration
  `0031` imports `R2Storage` + `MediaCloudinaryStorage`, so removing them breaks a fresh migrate.
  Removal awaits a separately approved migration squash.
- Doc alignment: `context.md` FR-13 + data-flow + services table updated to GCS; §8 issues
  **#2, #11, #12, #16 marked RESOLVED**. `task_plan.md` Phase 2 = Tasks 0–9 done, Task 10 pending.

**Test evidence:** provider grep clean (only retained pkgs, the shim, migration 0031, the
migration command, test fixtures, and docs — no active runtime refs); `pytest shop/tests` →
**60 passed** (incl. 0031 replay with the shim + Cloudinary removed); `manage.py check` → only
the 3 pre-existing allauth deprecations; fresh sqlite `migrate` 0001→0032 clean; `npm run build`
compiles.

---

## Phase 2 — Task 8 (part 1): Live Data Migration to GCS — DONE

**Date:** 2026-06-22
**Branch:** `phase-2-storage-gcs`
**Requirement refs:** NFR-4, FR-13, context.md §8 #2
**Commits:** `64559123`, `8f61c4ff` (migration-command fixes found during the live run)

- Owner approved the live `--execute` (AskUserQuestion). Dry-run inventory: **46 objects**
  (40 Cloudinary + 6 R2; the 6 R2 = 2 marker_mind, 2 model_glb 11.5 MB, 2 app_download_file
  ~398 MiB APKs). Manifest: `migration-manifests/phase-2-gcs.jsonl` (gitignored).
- **Result: all 46 distinct objects now in GCS** (`copied`/`verified_existing`, none missing),
  checksum-verified (size + base64 MD5). Independently confirmed anonymous HTTP readability
  (HTTP 206 on range GET) for samples incl. an APK, a GLB, a card image, and an avatar →
  public-read works end to end. Sources (Cloudinary/R2) left intact (deletion deferred to Task 10).
- **Two live failures found + fixed during the run (systematic debugging):**
  1. `RetryError: write operation timed out` — single-shot upload hit the 120 s timeout on the
     417 MB APK. Fixed: `blob.chunk_size = 16 MiB` (resumable chunked) + `timeout=600`
     (`64559123`). APKs then copied + verified.
  2. `OperationalError: SSL connection has been closed unexpectedly` — `.iterator()` held a
     server-side Postgres cursor open across the multi-minute uploads; Neon dropped the idle
     connection. Fixed: materialize the inventory list before uploading so the cursor closes
     first (`8f61c4ff`).
- **Known limitation (non-blocking for this dataset):** migrated objects are served as
  `application/octet-stream` (the command uploads bytes without setting `content_type`). Impact
  here is nil — **no video media exists** (ReviewMedia all IMAGE, ProductMedia are images),
  images render via browser sniffing, GLB/`.mind` are fetched as binary, and octet-stream is
  correct for APK download. Proper content-type preservation noted as optional polish (would
  need source content-type plumbing; revisit if visual verification shows any issue).

**Test evidence:** `pytest shop/tests` → 60 passed after each fix (`--basetemp=/tmp/elzpt`).
Manifest: 46/46 distinct objects present; anonymous GCS HTTP 206 confirmed on 4 samples.

**Live backend direct-upload smoke test (Claude, no browser):** `GCSGateway` signed a real V4
PUT URL → `curl` PUT returned **200** (signed `Content-Length` header caused **no 403**, so the
Task 8 browser-compat guard is NOT needed — header retained) → `stat()` confirmed size + content
type (`model/gltf-binary`) → generation-guarded `delete()` removed it (`stat` after = None). New
client uploads that send `Content-Type` are stored correctly typed, so the octet-stream caveat
above applies only to migrated legacy objects.

**Task 8 part 2 — manual browser verification (owner): ALL PASSED (2026-06-22).** Owner ran
the documented checklist against the local app (backend `runserver` + `npm start`):
- A. Migrated assets render from GCS: product images, avatar, About/persona/retailer, AR
  marker images, review images — all display.
- B. Web AR: both AR experiences render **and animate** the GLB at the marker (Phase 1
  deliverable confirmed on GCS).
- C. Admin direct upload: GLB + APK upload (PUT 200 → finalize 200) and delete succeed via the
  SPA.
- D. Non-admin blocked from admin upload (UI sanity; logic also covered by 39 auto tests).
- E. No `cloudinary`/`r2`/`gerainchan-assets` URLs in the Network tab — all assets served from
  `storage.googleapis.com/eleganza-ar-media-439528178601/...`.

**Task 8 COMPLETE.** Legacy sources retained (deletion is the Task 10 owner decision).

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
