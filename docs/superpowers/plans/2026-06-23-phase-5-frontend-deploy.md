# Phase 5 — Frontend Deploy (Firebase Hosting) — Implementation Plan

> Infra phase. Owner-operated Firebase/console steps interleaved with code/config. Halt-and-ask
> on ambiguity (`CLAUDE.md` §1). **Do not start until the owner approves this plan + decisions.**

**Goal:** Serve the React (CRA) SPA over HTTPS on **Firebase Hosting**, talking to the live
Phase 4 backend, with Google login, web AR (HTTPS camera), cart/order, and admin all working
end-to-end.

**Branch:** `phase-5-frontend-deploy` off `main` → annotated tag `phase-5-frontend-deploy`.

**Reuses / known facts:**
- CRA (`react-scripts 5`), build → `web/build/`. Only build-time env var: `REACT_APP_API_BASE_URL`
  (currently `http://127.0.0.1:8000/api` in `web/.env`). `web/src/lib/http.js` **throws** if unset.
- Backend live: `https://eleganza-api-439528178601.asia-southeast1.run.app`.
- Google OAuth client ID is **hardcoded** in `web/src/index.js` (`409741672143-…`); no env var
  needed. Its **Authorized JavaScript origins** must include the Firebase domain (console edit in
  the OAuth client's project `409741672143`).
- SPA routing (react-router v7) → Firebase needs a catch-all rewrite to `/index.html`.

---

## Locked scope decisions (to confirm)

1. **Firebase project → add Firebase to the existing `eleganza-ar` GCP project** (one project, same
   billing/credit) rather than a new project. Default Hosting site → **`eleganza-ar.web.app`**
   (+ `eleganza-ar.firebaseapp.com`).
2. **No custom domain** (use `*.web.app`).
3. **Prod API URL** baked at build via `web/.env.production`:
   `REACT_APP_API_BASE_URL=https://eleganza-api-439528178601.asia-southeast1.run.app/api`
   (committed — non-secret).
4. **Backend CORS/CSRF/FRONTEND_URL** updated to the Firebase origin(s) on the existing Cloud Run
   service (new revision; no rebuild).

---

## Tasks

### Task 0 — Firebase prerequisites (owner-operated)
- Add Firebase to project `eleganza-ar` (Firebase console “Add project → existing GCP project”, or
  `firebase projects:addfirebase eleganza-ar`). Install `firebase-tools`; `firebase login`.
- **Test:** `firebase projects:list` shows `eleganza-ar`. **Stop for owner confirmation.**

### Task 1 — Hosting config + prod env (code/config)
- **Files:** `web/firebase.json`, `web/.firebaserc`, `web/.env.production`, maybe `.gitignore`.
- `firebase.json`: `public: build`, SPA rewrite (`** → /index.html`), sensible cache headers
  (hashed static assets immutable; `index.html` no-cache so deploys take effect), ignore globs.
- `.firebaserc`: default project `eleganza-ar`.
- `.env.production`: the prod `REACT_APP_API_BASE_URL` (decision #3).
- **Test:** `npm run build` succeeds and the bundle embeds the prod API URL (grep the build).

### Task 2 — Backend wiring (owner-run or Claude, gcloud)
- Update the Cloud Run `eleganza-api` env (new revision, no rebuild):
  `FRONTEND_URL=https://eleganza-ar.web.app`,
  `CORS_ALLOWED_ORIGINS=https://eleganza-ar.web.app,https://eleganza-ar.firebaseapp.com`,
  `CSRF_TRUSTED_ORIGINS=` (append the same two origins to the existing run.app entry).
- **Test:** a browser-style cross-origin preflight (`OPTIONS`) from the Firebase origin returns the
  `Access-Control-Allow-Origin` header.

### Task 3 — Build + deploy to Firebase (owner-operated)
- `npm run build` (Claude can drive) → `firebase deploy --only hosting` (owner; interactive auth).
- **Test:** the `*.web.app` URL serves the SPA over HTTPS; deep links (e.g. `/shop`) resolve via the
  rewrite. **Capture the live URL.**

### Task 4 — Google OAuth origins (owner-operated, console)
- In project **`409741672143`** → the OAuth client → add `https://eleganza-ar.web.app`
  (and `https://eleganza-ar.firebaseapp.com`) to **Authorized JavaScript origins**. (Token flow via
  `@react-oauth/google` needs JS origins, not redirect URIs.)
- **Test:** Google login from the deployed site succeeds (Task 5).

### Task 5 — End-to-end manual verification (documented, `CLAUDE.md` §5.2)
- On the live site: signup/login (JWT) + **Google login**; browse products; cart → checkout/order;
  **web AR** loads + renders over HTTPS (camera permission); **admin** panel (login, an admin action,
  a presign/upload). Record steps + observed results in `progress.md`.

### Task 6 — Review, docs, merge + tag
- Self-review (+ `/code-review`, and `/security-review` for the CORS/origin/OAuth changes). Update
  `context.md` §7.2 (frontend live), `docs/services-and-billing.md` (Firebase active), `task_plan.md`.
  Owner approves → merge `--no-ff` → tag `phase-5-frontend-deploy` → push.

---

## Risks / watch
- **CORS/CSRF**: the prod origins must exactly match (scheme + host, no trailing slash) or login/API
  calls fail (the Phase 3/4 CORS lesson). Two Firebase domains exist (`.web.app` + `.firebaseapp.com`).
- **Build-time env**: `REACT_APP_API_BASE_URL` is baked at build — a wrong value needs a rebuild.
- **Mixed content / HTTPS**: AR needs HTTPS (Firebase provides it); ensure no hardcoded `http://`.
- **OAuth origin propagation**: Google origin changes can take minutes to take effect.
- **Cost**: Firebase Hosting free tier is generous; egress beyond it bills to `eleganza-ar`.

## Rollback
- Frontend is static — Firebase keeps release history (`firebase hosting:rollback`). Backend env
  changes are a revision revert. Phase tag marks the boundary.
