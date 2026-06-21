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
- `web/src/pages/ARViewer.js` loads only A-Frame 1.5.0 + mind-ar 1.2.3
  (`mindar-image-aframe.prod.js`). No `aframe-extras`.
- The `<a-gltf-model id="ar-model">` has no `animation-mixer` attribute.
- Line ~185 calls `modelEl.removeAttribute("animation-mixer")` on targetLost, but it is
  never added → dead/leftover code.
- A-Frame does not auto-play glTF animation clips without `animation-mixer` → static model.
  This matches the reported symptom (object shows, no animation). The Unity APK animates
  via its own Animator, a separate path.

### Model-size problem
- Web AR loads `model_glb` from the AR API record (R2 today, GCS after Phase 2).

### Served-model baseline (Task 1, 2026-06-21)
- Live Neon contains two enabled marker records, and both are genuinely selectable by the
  product-slug lookup in `ARViewer.js`:
  - PK 1, `ELEGANZA` →
    `ar/models/372f75fe-7bc0-4725-8241-002fbe01b09d_eleganza.glb`
  - PK 2, `ELEGANZA INTENSE` →
    `ar/models/e821f00a-5dab-40ab-a2b4-f9e4512ded07_eleganza.glb`
- Both public R2 objects report `Content-Length: 413910032` bytes and ETag
  `450bcacd1ac6e51b20782fdd25e2f171`. The downloaded PK 1 object at
  `C:\tmp\web_model.glb` has the same 413,910,032-byte length and MD5, proving that the
  inspected file is the live served object. The matching PK 2 ETag/length proves it is a
  byte-identical copy.
- `@gltf-transform/cli@4.4.0 inspect` reports **36 animation clips** and **67 channels**.
  Animation gate: **PASS** (non-zero clips).
- Baseline duration/channel signature, in clip order:
  `butterfly animation` (14.2s/3); `3icecube animation` (12.4s/3);
  `ice cube animation` (12.4s/3); `2ice cube animation` (12.4s/3);
  `Lavender animation` ×3 (19s/1 each); `candalmom` ×2 (21s/1 each);
  `seed2 animation` (21s/3); `seed4 animation` (21s/3); `seed5 animation` (21s/2);
  `seed animation` (21s/3); `seed1 animation` (21s/3); `seed6 animation` through
  `seed9 animation` (21s/2 each); `seed3 animation` (21s/3); `seed10 animation`
  through `seed13 animation` (21s/2 each); `Mandarin animation` (4s/1);
  `sandalwood animation` ×2 (23.3s/1 each); `apple animation` (2s/1);
  `JuniperBerry animation` ×2 (17s/1 each); `ozone animation` (13s/1);
  `jasmine animation` ×3 (15s/1 each); `butterfly2 animation` (19.1s/3);
  `butterfly3 animation` (21.1s/3); `word E animation` (27.5s/1).

### Library specifics (verified via web, 2026-06)
- **aframe-extras** (maintained c-frame fork) — current line **7.x** (7.7.0 seen on CDN),
  compatible with A-Frame 1.4/1.5. Provides the `animation-mixer` component.
  CDN: `https://cdn.jsdelivr.net/npm/aframe-extras@7.7.0/dist/aframe-extras.min.js`.
  (Load AFTER A-Frame, before/with mind-ar. Verify it registers `animation-mixer`.)
  Source: https://github.com/c-frame/aframe-extras , https://www.npmjs.com/package/aframe-extras
- **gltf-transform CLI** (`@gltf-transform/cli`):
  - Inspect: `npx @gltf-transform/cli@4.4.0 inspect input.glb` → lists meshes, textures, size,
    and **animation count** (use to confirm clips exist + baseline size).
  - Optimize: `npx @gltf-transform/cli@4.4.0 optimize input.glb output.glb --compress draco \
    --texture-compress webp --texture-size 1024 --flatten false --join false` → 97.22%
    reduction here, without introducing the default flatten stage's invalid quaternion.
  Source: https://gltf-transform.dev/cli , https://www.npmjs.com/package/@gltf-transform/cli

### Task 1 result
- [x] Confirmed the exact live-served GLBs, their byte identity, and their embedded clips.
      The 36-clip gate passed, so Phase 1 may proceed to optimization and viewer playback.

### Optimized-model result (Task 2, 2026-06-21)
- Pinned tool/flags: `@gltf-transform/cli@4.4.0`, Draco geometry compression, WebP
  texture compression, and `--texture-size 1024`. The v4 help output explicitly confirms
  `--texture-size` is the supported flag.
- The first default `optimize` output introduced `ROTATION_NON_UNIT` at node 63 even though
  the source validator reported `No errors found`. Re-running with `--flatten false
  --join false` preserved the scene transforms and removed that regression.
- Final artifact: `C:\tmp\web_model_optimized.glb`, 11,499,420 bytes, down from
  413,910,032 bytes (**97.22% reduction**).
- Final validation: `@gltf-transform/cli@4.4.0 validate` exited 0 and reported
  `No errors found`.
- Animation parity: **PASS** — all 36 clip names, all 67 channels, and every clip duration
  match the Task 1 baseline. Keyframe counts are lower because the optimizer's documented
  resample stage losslessly deduplicated redundant keyframes.
- Visual animation/playback parity remains part of the Task 6 camera + marker manual gate;
  the optimized object has not yet been written to live R2 or Neon.
