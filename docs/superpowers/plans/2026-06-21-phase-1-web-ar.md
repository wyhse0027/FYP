# Phase 1 — Web AR Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-browser AR render the product model *and play its animation*, and
shrink the model so it actually loads on mobile.

**Architecture:** Two independent fixes in one phase. (a) Asset: optimize the oversized
`.glb` with `gltf-transform` (Draco geometry + WebP/resized textures) and replace the stored
model. (b) Code: load the `aframe-extras` `animation-mixer` component in `ARViewer.js` and
attach it to the model entity so embedded glTF clips play.

**Tech Stack:** A-Frame 1.5.0, MindAR 1.2.3 (image-aframe), aframe-extras 7.7.0 (CDN),
`@gltf-transform/cli` (dev tooling via `npx`), React 19 (CRA).

## Global Constraints

- A-Frame pinned `1.5.0`; MindAR pinned `1.2.3` — do **not** change these.
- `aframe-extras` is loaded as a **runtime CDN `<script>`**, version `7.7.0`, URL
  `https://cdn.jsdelivr.net/npm/aframe-extras@7.7.0/dist/aframe-extras.min.js` — **no**
  `package.json` change (not an npm dependency).
- `@gltf-transform/cli` is **dev tooling run via `npx`**, never a runtime dependency.
- Testing is **hybrid** (per `CLAUDE.md` §5): asset steps verified via `gltf-transform
  inspect` output; AR rendering verified by **documented manual steps** (no automated AR
  test). Record manual results in `progress.md`.
- Storage backend in this phase is the current one (Cloudflare R2). Phase 2 migrates media
  to GCS and will carry the optimized model — do not block on GCS here.
- Work on branch `phase-1-web-ar` off `main`; Conventional Commits; one commit per task;
  finish with per-phase review, merge to `main`, annotated tag `phase-1-web-ar`.
- No new runtime npm dependencies without explicit approval.
- Demo-grade: smallest correct change; do not refactor `ARViewer.js` beyond what's listed.

## File Structure

- `ar-perfume-shop/src/pages/ARViewer.js` — **modify**: load aframe-extras; add
  `animation-mixer` to the model entity; remove the dead `removeAttribute` line.
- Optimized model artifact (e.g. `eleganza_optimized.glb`) — produced by tooling, uploaded
  to storage, referenced by the `ARExperience.model_glb` record. Not committed to git
  (`.glb` is gitignored; binaries live in object storage).
- `findings.md`, `progress.md`, `task_plan.md`, `context.md` — **update** as tasks complete.

---

## Setup

- [ ] **Create the phase branch**

```bash
git checkout main
git pull --ff-only
git checkout -b phase-1-web-ar
```

---

### Task 1: Confirm the served model has animation, record baseline

**Files:**
- Modify: `findings.md` (record results)

**Interfaces:**
- Produces: confirmed animation-clip count and baseline byte size of the web-AR `.glb`;
  the local path/URL of the model used by the AR record.

- [ ] **Step 1: Find which GLB the web AR uses**

Query the AR record's model field (local DB mirrors production schema):

```bash
python manage.py shell -c "from shop.models import ARExperience; [print(a.product.name, '->', a.model_glb.name, a.model_glb.url) for a in ARExperience.objects.exclude(model_glb='')]"
```

Expected: one or more lines printing the product name and the `model_glb` key + URL
(an `ar/models/...glb` path on R2).

- [ ] **Step 2: Obtain the file locally**

If the printed URL is reachable, download it; otherwise use the local source
`eleganza_ar/eleganza.glb` (the 413 MB master) as the inspection target:

```bash
curl -L -o /tmp/web_model.glb "<model_glb_url_from_step_1>"   # if reachable
# fallback if not reachable:
# cp "eleganza_ar/eleganza.glb" /tmp/web_model.glb
```

- [ ] **Step 3: Inspect for animations + size**

```bash
npx @gltf-transform/cli inspect /tmp/web_model.glb
```

Expected: a report table. Read the **animations** row (clip count) and the total file
size. Record both.

- [ ] **Step 4: Record findings + gate**

Append clip count + size to `findings.md` under Phase 1.

**Gate:** if **animations == 0**, STOP and escalate — the web `.glb` was exported without
clips and must be re-exported with animation from the source (Unity/Blender) before this
phase is meaningful. Do not proceed to Task 4/5 with a clip-less model.

- [ ] **Step 5: Commit the findings update**

```bash
git add findings.md
git commit -m "docs(ar): record web AR model animation + baseline size"
```

---

### Task 2: Optimize the model

**Files:**
- Produce: `/tmp/web_model_optimized.glb` (artifact, not committed)
- Modify: `findings.md`

**Interfaces:**
- Consumes: `/tmp/web_model.glb` from Task 1.
- Produces: an optimized `.glb` with the **same animation clip count** and a much smaller
  size (target: single-digit MB).

- [ ] **Step 1: Run the optimize pipeline**

```bash
npx @gltf-transform/cli optimize /tmp/web_model.glb /tmp/web_model_optimized.glb \
  --compress draco --texture-compress webp --texture-resize 1024
```

Expected: completes without error; prints before/after size.

- [ ] **Step 2: Verify clips preserved + size reduced**

```bash
npx @gltf-transform/cli inspect /tmp/web_model_optimized.glb
```

Expected: **animations count equals Task 1's count**; total size is single-digit MB (or at
least an 80%+ reduction). If clips were dropped, re-run optimize without `--prune` aggressive
options (default `optimize` keeps clips; if not, run `gltf-transform draco` +
`gltf-transform resize` separately to avoid pruning animation data).

- [ ] **Step 3: Record + commit**

Append before/after sizes and confirmed clip count to `findings.md`.

```bash
git add findings.md
git commit -m "docs(ar): record optimized model size + preserved clips"
```

---

### Task 3: Replace the stored model + update the AR record

**Files:**
- Modify: storage object (R2) + `ARExperience.model_glb` (DB); no source files.

**Interfaces:**
- Consumes: `/tmp/web_model_optimized.glb` from Task 2.
- Produces: the AR API (`/api/ar/?product__name=...`) returns the optimized model URL.

- [ ] **Step 1: Upload the optimized model to storage**

Use the existing admin AR edit flow (presigned R2 upload at `/api/uploads/r2-presign/` →
PUT → `/api/ar/<id>/finalize-bigfile/`) OR, locally, upload directly and set the field:

```bash
python manage.py shell -c "from shop.models import ARExperience; from django.core.files import File; a=ARExperience.objects.get(pk=<PK>); f=open('/tmp/web_model_optimized.glb','rb'); a.model_glb.save('ar/models/eleganza_optimized.glb', File(f), save=True); print('updated:', a.model_glb.url)"
```

Expected: prints the new `model_glb.url`.

- [ ] **Step 2: Verify the API serves the new model**

```bash
curl -s "http://127.0.0.1:8000/api/ar/?product__name=Eleganza" | python -m json.tool | grep model_glb
```

Expected: the optimized object key/URL appears.

- [ ] **Step 3: Commit (DB change is data, not code — note in progress.md)**

```bash
git add progress.md
git commit -m "chore(ar): swap web AR model to optimized glb (data change logged)"
```

(Append to `progress.md`: which PK was updated, old vs new size.)

---

### Task 4: Load aframe-extras in the AR viewer

**Files:**
- Modify: `ar-perfume-shop/src/pages/ARViewer.js`

**Interfaces:**
- Produces: `window.AFRAME` has the `animation-mixer` component registered before the scene
  mounts.

- [ ] **Step 1: Add the CDN constant**

Near the existing `AFRAME_SRC` / `MINDAR_SRC` constants (top of file), add:

```js
const AFRAME_EXTRAS_SRC =
  "https://cdn.jsdelivr.net/npm/aframe-extras@7.7.0/dist/aframe-extras.min.js";
```

- [ ] **Step 2: Load it in the script chain (after A-Frame is ready, before MindAR)**

In the `run` async function, between the `AFRAME.THREE` wait and the MindAR load, insert the
extras load:

```js
// existing: wait until window.AFRAME.THREE is ready, sets window.THREE
await loadScript("aframe-extras", AFRAME_EXTRAS_SRC); // provides animation-mixer
if (!window.MINDAR) await loadScript("mindar", MINDAR_SRC);
```

- [ ] **Step 3: Verify the component registered (manual, browser console)**

Run the app (`npm start` in `ar-perfume-shop`), open the AR route, and in DevTools console:

```js
!!AFRAME.components["animation-mixer"]
```

Expected: `true`. Record in `progress.md`.

- [ ] **Step 4: Commit**

```bash
git add ar-perfume-shop/src/pages/ARViewer.js
git commit -m "feat(ar): load aframe-extras for animation-mixer"
```

---

### Task 5: Attach animation-mixer to the model + remove dead code

**Files:**
- Modify: `ar-perfume-shop/src/pages/ARViewer.js`

**Interfaces:**
- Consumes: `animation-mixer` registered (Task 4).
- Produces: the model plays its embedded clip while rendered.

- [ ] **Step 1: Add `animation-mixer` to the model entity**

Change the `<a-gltf-model id="ar-model" ...>` element to include the mixer attribute:

```jsx
<a-gltf-model
  id="ar-model"
  src={data.model_glb}
  scale="0.75 0.75 0.75"
  rotation="-90 180 0"
  animation-mixer="clip: *; loop: repeat"
/>
```

- [ ] **Step 2: Remove the dead removeAttribute line**

In the `targetLost` handler, delete the line that strips the mixer (it stopped animation and
was never re-added):

```js
// DELETE this line inside the targetLost listener:
// if (modelEl) modelEl.removeAttribute("animation-mixer");
```

The model is already hidden on lost via `anchor.object3D.visible = false`, so the mixer can
keep ticking harmlessly.

- [ ] **Step 3: Commit**

```bash
git add ar-perfume-shop/src/pages/ARViewer.js
git commit -m "fix(ar): play glb animation via animation-mixer (FR-3.1)"
```

---

### Task 6: Manual AR verification (hybrid testing)

**Files:**
- Modify: `progress.md` (record evidence)

- [ ] **Step 1: Serve over HTTPS/localhost and open the AR route**

Run the frontend; navigate to `/arview/eleganza` (slug = product name kebab-cased). Camera
AR requires HTTPS or `localhost`.

- [ ] **Step 2: Run the verification script and record results**

Check and record PASS/FAIL for each in `progress.md`:
1. Scripts load (no console errors); `AFRAME.components["animation-mixer"]` is `true`.
2. "Start AR" begins the camera; pointing at the marker fires `targetFound`.
3. The model appears on the marker.
4. **The model animates** (the clip plays and loops).
5. Model load time on a mid-range phone is acceptable (single-digit seconds) — the
   optimized model size from Task 2.

- [ ] **Step 3: Commit the evidence**

```bash
git add progress.md
git commit -m "test(ar): record manual web AR verification results"
```

---

### Task 7: Docs, review, merge, tag

**Files:**
- Modify: `task_plan.md`, `context.md`

- [ ] **Step 1: Update tracking docs**

- `task_plan.md`: set Phase 1 status to `complete`.
- `context.md` §8: mark issue #1 (web AR animation) resolved; note FR-3.1 met and the model
  size reduction.

- [ ] **Step 2: Per-phase review**

Run `/code-review` on the branch diff. Resolve or justify each finding (per `CLAUDE.md` §6.2).

- [ ] **Step 3: Commit docs**

```bash
git add task_plan.md context.md
git commit -m "docs: close out Phase 1 (web AR fixed)"
```

- [ ] **Step 4: Merge to main + tag**

```bash
git checkout main
git merge --no-ff phase-1-web-ar -m "merge: Phase 1 — web AR fix"
git tag -a phase-1-web-ar -m "Phase 1 complete: web AR animation + optimized model"
git push origin main --tags
```

---

## Self-Review (completed by author)

- **Spec coverage:** FR-3.1 (web AR renders + animates) — Tasks 4–6. Model-size issue
  (context §8 #1) — Tasks 1–3. Both roadmap Phase 1 outcomes covered.
- **Placeholder scan:** no TBD/TODO; the only branch is Task 1's explicit zero-clip
  escalation gate (a real decision point, not a placeholder).
- **Type/name consistency:** `animation-mixer` component name, `model_glb` field, and the
  `/api/ar/` query are consistent with the codebase (`ARViewer.js`, `shop/models.py`,
  `shop/urls.py`).
- **Known risk:** if Task 1 finds zero clips, execution halts pending a re-export — flagged
  in Task 1's gate and `findings.md`.
