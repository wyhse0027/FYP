# Task Plan — Eleganza AR Perfume Improvement Program

**Goal:** Restore and elevate the AR perfume app to a polished, demo-grade product,
deployed all-in on GCP.

**Reference:** `context.md` (specs) · `docs/superpowers/specs/2026-06-21-project-roadmap-design.md`
(roadmap) · `CLAUDE.md` (process: phase branches + tags, hybrid tests, doc alignment).

## Phases

| # | Phase | Branch / Tag | Status | Plan doc |
|---|-------|--------------|--------|----------|
| 1 | Web AR fix (animation + GLB optimize) | `phase-1-web-ar` | ✅ complete (tag `phase-1-web-ar`) | `docs/superpowers/plans/2026-06-21-phase-1-web-ar.md` |
| 2 | Storage → GCS + upload hardening | `phase-2-storage-gcs` | Tasks 0–9 done; Task 10 (review/merge/tag) pending | `docs/superpowers/plans/2026-06-21-phase-2-storage-gcs.md` |
| 3 | Correctness, security hardening & minimal CI | `phase-3-hygiene` | pending | — |
| 4 | Backend deploy (Cloud Run + Cloud SQL) | `phase-4-backend-deploy` | pending | — |
| 5 | Frontend deploy (Firebase Hosting) | `phase-5-frontend-deploy` | pending | — |
| 6 | Luxury UI/UX redesign (user + admin) | `phase-6-ui-redesign` | pending | — |
| 7 | Broaden test coverage | `phase-7-tests` | pending | — |

Per-phase plans are written when each phase begins (one plan doc per phase).

## Current Focus

**Phase 1 — Web AR fix: ✅ COMPLETE** — model optimized 413.9 MB → 11.5 MB, both AR records
repointed, viewer renders + animates (verified in-browser), old objects deleted. Tagged
`phase-1-web-ar`. Deferred refinement: animation clip curation (context.md §8 #20).

**Phase 2 — Storage → GCS + upload hardening: Tasks 0–9 DONE** on `phase-2-storage-gcs`.
GCS is the sole media backend; presign/finalize/delete + legacy AR deletes are admin-only and
object-verified; review uploads validated; all 46 media migrated to GCS (verified, sources
retained); legacy R2/Cloudinary runtime config removed. Browser/AR manual verification passed.
**Remaining: Task 10** — formal code + security review, owner source-deletion decision, then
merge to `main` + tag `phase-2-storage-gcs`.

**Standing context:**
- Credentials rotated + old keys revoked (exposure closed). Email → free transactional
  provider (Brevo/Resend) in Phase 3.
- Resequence adopted: storage authz + upload validation → Phase 2; security hardening +
  minimal CI → Phase 3 (before deploy).

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |
