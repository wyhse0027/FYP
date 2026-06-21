# progress.md — Development Log

Append-only log of phases, tasks, decisions, and test evidence. One entry per task
(see `CLAUDE.md` §7.2). Newest at top.

---

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
