# Services & Billing Tracker

Operational reference of every external service the Eleganza / GERAIN CHAN AR project depends
on, for cost tracking. **Last updated: 2026-06-22 (after Phase 2).**

> No secrets here — identifiers and account names only. Real credentials live in
> `server/backend/.env` (gitignored) and, in production, Secret Manager.

## TL;DR — where the money is

- **One GCP billing account** holds the project credit (~RM 33k, billing-account-level). The
  dedicated project **`eleganza-ar`** (project number `439528178601`) bills to it. This is the
  account to watch — Phase 4/5 (Cloud Run, Cloud SQL, Firebase) will draw it down.
- Everything else is currently **free-tier or legacy** (no charges expected), **except** keep an
  eye on the items flagged "⚠ watch" below.
- The original paid host (**Koyeb**) was deleted for a payment lapse — that is what this project
  is recovering from. Don't recreate a paid host without a billing plan.

---

## Active services (in use now)

| Service | Purpose | Account / identifier | Plan / tier | Cost status | Watch |
|---|---|---|---|---|---|
| **GCP – Cloud Storage** | All media (images, `.glb`, `.mind`, `.apk`) | project `eleganza-ar` (`439528178601`), bucket `eleganza-ar-media-439528178601`, region `asia-southeast1`, STANDARD | Pay-as-you-go on the **credit** | On credit (free until credit runs out) | ⚠ Storage ≈ **0.85 GB** (46 objects). Egress + Class-A/B ops are billable; AR/GLB downloads = egress. 7-day soft-delete keeps deleted bytes billable for the window. |
| **GCP – IAM / IAM Credentials** | Service account + signed-URL signing | project `eleganza-ar`; SA `eleganza-storage@eleganza-ar.iam.gserviceaccount.com` | — | Free | — |
| **Neon** | Current Postgres DB | `DATABASE_URL` (Neon) | Free/launch tier (verify) | Free (verify) | ⚠ Confirm the Neon plan; being replaced by Cloud SQL in Phase 4. |
| **Google OAuth** | Social login | OAuth client from `fyp-login-system` (reused) | Free | Free | — |
| **Brevo** | Transactional email (password reset) via HTTP API | `BREVO_API_KEY` (in `.env`); sender `yhwoo516@gmail.com` | Free (300 emails/day) | Free | ⚠ Brevo enforces **Authorized IPs** — local IP `60.53.186.250` authorized. **At Cloud Run deploy (Phase 4): authorize the egress IP** or sends 401, or use a static egress IP. |
| **GitHub** | Source hosting | `github.com:wyhse0027/FYP` | Free | Free | — |

## Legacy / retained (being decommissioned — do not top up)

| Service | Why still present | Identifier | Cost status | Action |
|---|---|---|---|---|
| **Cloudflare R2** | Former big-file storage; **source objects kept as Phase 2 rollback net** | `R2_*` (in `.env`) | Free tier (≈0.82 GB ≪ 10 GB free) | Delete objects + revoke keys once GCS is proven stable (owner deferred in Phase 2 Task 10). |
| **Cloudinary** | Former image storage; **source objects kept as rollback net** | `CLOUDINARY_*` (in `.env`) | Free tier (≈0.03 GB) | Same — delete + revoke after demo is stable. |
| **SendGrid** | Former password-reset email | `SENDGRID_API_KEY` | **Retired (Phase 3)** — replaced by Brevo | Dependency dropped + code removed. Delete the dead `SENDGRID_API_KEY` line from local `.env`; revoke the key if the (expired) account is still reachable. |
| **Vercel** | Old frontend deploy (`gerainchan.vercel.app`) | — | Free tier (verify) | Replaced by Firebase Hosting in Phase 5; retire after. |
| **Koyeb** | Original backend host | — | **Deleted (payment lapse)** | None — gone. Root cause of the revival. |

## Planned (future phases — will start drawing the GCP credit)

| Service | Phase | Purpose | Billing note |
|---|---|---|---|
| **GCP – Cloud Run** | 4 | Django backend container | Billed per request/CPU/memory on the credit. ⚠ Cap max-instances. |
| **GCP – Cloud SQL (Postgres)** | 4 | Primary DB (replaces Neon) | ⚠ Runs ~24/7 → steady credit burn; pick the smallest viable tier. |
| **Firebase Hosting** | 5 | Frontend (HTTPS, required for web AR) | Free tier generous; egress beyond it bills to the GCP project. |
| **GCP – Secret Manager** | 4 | Production secrets (replaces `.env`) | Tiny cost (per-secret/version + access ops). |
| ~~Brevo or Resend~~ | 3 | ✅ Done — **Brevo** chosen (HTTP API), now in Active services above | — |
| **Cloud CDN** | (only if needed) | AR asset delivery | Optional; add only if measured AR egress warrants it. |

---

## Periodic checks (for payment safety)

- **GCP Billing console** → watch the credit balance + set a **budget alert** (e.g. at 50% / 90%
  of the credit) on the billing account. This is the single most important guardrail.
- After Phase 4/5 go live: confirm Cloud Run min-instances and Cloud SQL tier aren't burning the
  credit while idle.
- Before deleting R2/Cloudinary sources: confirm GCS is stable (then the free legacy tiers cost
  nothing anyway — deletion is for hygiene/security, not cost).
- Nothing here currently requires a personal card except verifying Neon/Vercel free-tier limits.
