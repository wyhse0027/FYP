# CLAUDE.md — Project Development Harness

Binding process rules for all development in this repository (Eleganza / GERAIN CHAN —
AR perfume e-commerce). This file governs **how** work is done. [`context.md`](./context.md)
governs **what** is built (the specifications). Both are authoritative and must stay aligned.

These rules are deliberately strict. They exist to keep a previously sprawling codebase
maintainable, reviewable, and revertable.

---

## 0. Precedence & Sources of Truth

1. The user's explicit, in-conversation instructions — highest priority.
2. **This file (`CLAUDE.md`)** — the development harness.
3. **`context.md`** — the canonical functional & non-functional specification.
4. The user's global `~/.claude/CLAUDE.md` rules — still apply in full.
5. Default assistant behavior — lowest priority.

If any two conflict, the higher item wins. If a conflict is material, **stop and ask**.

- `context.md` = single source of truth for specs (what the system must do).
- `progress.md` = running log of phases, tasks, decisions, and test evidence.
- Git history + tags = the revertable record of how the system reached its current state.

---

## 1. No-Assumption Decision Making

1.1 **Halt-and-ask on ambiguity.** Never infer scope, data shapes, API contracts, env var
names, file paths, library behavior, or intended UX. If it is not stated in the request,
`context.md`, or the code, **stop and ask one precise question.**

1.2 **No fabrication.** Do not invent endpoints, fields, signatures, or service behavior.
If unsure, verify in the code or ask. "I think" is not allowed in a decision — confirm it.

1.3 **Record answers.** When the user resolves an ambiguity, capture it in `context.md`
(if it is a spec) or `progress.md` (if it is a decision), so it is never re-guessed.

1.4 **No silent scope expansion.** Implement exactly what was approved. Improvements are
stated in one sentence and require approval before action.

---

## 2. Requirement Alignment (Documentation Cross-Check)

2.1 **Every task maps to a requirement.** Before coding, identify the `FR-x` / `NFR-x`
in `context.md` the task fulfills. State it.

2.2 **No orphan work.** If no requirement covers the task, **stop**, propose the new
requirement, get approval, add it to `context.md`, *then* code.

2.3 **Re-read before coding.** Open and re-read the relevant `context.md` section at the
start of each task. Specs drift from memory; the file is authoritative.

2.4 **Reconcile at completion.** Before declaring a task done, confirm the change still
matches `context.md`. If code and spec diverge, surface it and update one of them in the
same task. **Code and `context.md` must never contradict each other at a commit boundary.**

---

## 3. Planning Discipline

3.1 **Plan before non-trivial change.** Any change that touches >3 files, exceeds ~100
lines, adds a dependency, alters the DB schema, or changes an endpoint requires a short
written plan **approved before implementation.**

3.2 A plan states: the requirement ref, the files to change, the test approach, and the
rollback point (branch/tag).

3.3 **No speculative branching.** Do not present multiple alternative implementations
unless explicitly asked. Give one recommendation.

---

## 4. Phase Workflow & Version Control (Revertable)

4.1 **Phases.** Work is divided into numbered phases; one phase = one cohesive,
shippable deliverable (e.g. `phase-1-web-ar`, `phase-2-storage-gcs`).

4.2 **Branch per phase.** Create `phase-<n>-<slug>` off the mainline before starting.
Never develop a phase directly on the mainline.

4.3 **One commit per completed task.** Conventional Commits format
(`type(scope): subject`, subject < 72 chars). A commit is created **only after** the
task's tests pass (§5) and the user approves it. No Claude attribution lines unless asked.

4.4 **Merge + tag on phase completion.** When a phase passes its review gate (§6), merge
to mainline via PR, then create an **annotated tag** `phase-<n>-<slug>`. Each tag is a
clean restore point.

4.5 **Reversion.** Any phase boundary can be restored via its tag (`git checkout <tag>`)
or by reverting the phase's merge commit. Keep phases self-contained so reverting one does
not silently break another.

4.6 **Forbidden without explicit per-instance approval:** force-push, history rewrite,
rebasing shared branches, deleting tags/branches, `reset --hard` on shared work.

---

## 5. Testing Gate (Hybrid)

5.1 **Backend logic is automated.** API views, serializers, permissions, model methods,
and business rules ship with `pytest` / Django `TestCase` tests in the same task.

5.2 **UI / AR / camera / file-upload flows are manually verified** with **documented
steps and observed results** (automation there is impractical). The manual script and its
outcome are recorded in `progress.md`.

5.3 **Definition of "tested."** A task is not done until its tests have been **run** and
**pass**, with the output/evidence shown. "Looks correct" / "should work" is not testing.

5.4 **Never weaken tests to pass.** Do not skip, comment out, or delete tests to clear a
failure. Fix the code or fix the test's logic.

5.5 **Migrations** must apply cleanly (`migrate` on a disposable copy) before merge.

---

## 6. Code Review

6.1 **Per-task self-review.** Before presenting a change, review the diff against:
correctness, scope (no drive-by edits), no secrets/keys, error handling, and alignment
with `context.md`. Report what was checked.

6.2 **Per-phase formal review.** At phase completion, run a formal review pass
(`/code-review`; plus `/security-review` for any change touching auth, storage
credentials, presigned URLs, CORS, or permissions) **before merge**.

6.3 **Resolve every finding.** Each review finding is fixed or explicitly justified.
No silent dismissals.

---

## 7. Documentation Alignment

7.1 **Docs change with code.** Any change to behavior, config, endpoints, schema, env
vars, or deployment updates `context.md` **in the same task**.

7.2 **Progress log.** `progress.md` is appended every task: date, phase, task, requirement
ref, test evidence, and any decision made.

7.3 **No false docs.** If a change makes any statement in `context.md` or `progress.md`
false, correct it in the same commit.

---

## 8. Security & Secrets

8.1 **Compromised secrets.** The credentials present in `server/backend/.env` (Django key, Google
OAuth secret, SendGrid key, Neon URL, Cloudinary secret, R2 keys) are treated as
**compromised** and must be **rotated before any redeployment**. Tracked as a requirement.

8.2 **Never commit secrets.** `.env` stays gitignored. `server/backend/.env.sample` documents
the shape only (no real values).

8.3 **Flag sensitive changes** for security review (§6.2).

---

## 9. Dependencies & Stack

9.1 **No silent installs.** No new dependency, runtime/version bump, or lockfile
regeneration without listing it and getting approval.

9.2 **Match the stack.** Django 5.2 / DRF / SimpleJWT (backend), CRA React 19 (frontend),
Google Cloud Storage (storage target — Cloudflare R2 is the current backend, migrating in
Phase 2 per the roadmap), MindAR + A-Frame (web AR), Unity-built APK (native AR). Use
existing idioms; do not introduce parallel patterns.

---

## 10. Stop Conditions

10.1 **Two-strike rule.** If the same approach fails twice, stop, report findings, and ask.
Do not loop on retries.

10.2 **Surface blockers early.** Missing context, unavailable services, or ambiguous
requirements are raised immediately — not after partial work.

10.3 **Honest reporting.** If something failed, was skipped, or is unverified, say so
plainly with evidence. Never claim completion based on writing code alone.
