# Findings

Research and discoveries. External/web content recorded here only (never in `task_plan.md`),
treated as untrusted reference.

## Security — credential liveness (verified 2026-06-21)

Ran a read-only liveness check with the keys in `server/backend/.env`:
- **NEON: LIVE** (DB connected, `SELECT 1` ok).
- **R2: LIVE** (bucket `gerainchan-assets` reachable, KeyCount=1).
- **CLOUDINARY: LIVE** (`api.ping()` → status ok).
→ All exposed credentials are active. **Rotate immediately** (Neon, R2, Cloudinary, Google
OAuth secret, SendGrid, Django SECRET_KEY). Then move to Secret Manager in the new GCP project.

## Codex review (2026-06-21) — verified findings

Spot-checked the load-bearing claims against the code:
- `web/src/config/api.js` is **not imported** anywhere → dead code (the "env inconsistency"
  framing was overstated).
- Admin gating: backend uses `IsAdminUser` (is_staff) throughout `server/shop/views.py`;
  frontend uses `user.role === "admin"` → split authority, can desync.
- `ARDeleteMarker/GLB/Mind` views (`server/shop/views.py` ~903) have **no** `permission_classes`
  → default `IsAuthenticatedOrReadOnly` lets any signed-in user delete AR files.
- `server/shop/views_upload.py` presign/finalize/delete use `IsAuthenticated` (not admin);
  finalizer trusts the client key without verifying the object.
- `DEBUG`/`SECRET_KEY` fail open (default True / "dev-only").
Accepted (consistent, not line-verified): checkout oversell + float money; password policy
bypass; unvalidated review uploads; quiz-answer scoping; Google login gaps; JWT/localStorage +
90d refresh + unversioned CDN/no SRI. Per-field storage binding in `models.py` means Phase 2
needs field-storage + schema migrations (not just a default swap).

## Phase 1 — Web AR

### Animation root cause (confirmed via code review)
- `ar-perfume-shop/src/pages/ARViewer.js` loads only A-Frame 1.5.0 + mind-ar 1.2.3
  (`mindar-image-aframe.prod.js`). No `aframe-extras`.
- The `<a-gltf-model id="ar-model">` has no `animation-mixer` attribute.
- Line ~185 calls `modelEl.removeAttribute("animation-mixer")` on targetLost, but it is
  never added → dead/leftover code.
- A-Frame does not auto-play glTF animation clips without `animation-mixer` → static model.
  This matches the reported symptom (object shows, no animation). The Unity APK animates
  via its own Animator, a separate path.

### Model-size problem
- `eleganza_ar/eleganza.glb` ≈ 413 MB (local, untracked). Unusable over mobile web AR.
- `eleganza_ar/markerless_ar.glb` ≈ 1.4 MB (a small model exists).
- Web AR loads `model_glb` from the AR API record (R2 today, GCS after Phase 2), which may
  or may not be the 413 MB file — must inspect the actual served object.

### Library specifics (verified via web, 2026-06)
- **aframe-extras** (maintained c-frame fork) — current line **7.x** (7.7.0 seen on CDN),
  compatible with A-Frame 1.4/1.5. Provides the `animation-mixer` component.
  CDN: `https://cdn.jsdelivr.net/npm/aframe-extras@7.7.0/dist/aframe-extras.min.js`.
  (Load AFTER A-Frame, before/with mind-ar. Verify it registers `animation-mixer`.)
  Source: https://github.com/c-frame/aframe-extras , https://www.npmjs.com/package/aframe-extras
- **gltf-transform CLI** (`@gltf-transform/cli`):
  - Inspect: `npx @gltf-transform/cli inspect input.glb` → lists meshes, textures, size,
    and **animation count** (use to confirm clips exist + baseline size).
  - Optimize: `npx @gltf-transform/cli optimize input.glb output.glb --compress draco \
    --texture-compress webp --texture-resize 1024` → typical 80–95% size reduction.
  Source: https://gltf-transform.dev/cli , https://www.npmjs.com/package/@gltf-transform/cli

### Still to confirm at execution (Task 1)
- [ ] Which GLB the web AR record points to, and whether it contains animation clips.
      The Unity APK animates → the source model almost certainly has clips, but the web
      `.glb` export must be confirmed. If zero clips: escalate (re-export with animation
      before the web fix is meaningful).
