# Services & Billing Tracker

Operational reference of every external service the Eleganza / GERAIN CHAN AR project depends
on, for cost tracking. **Last updated: 2026-06-23 (after Phase 4 backend deploy).**

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
| **GCP – Cloud Run** | Django backend (`eleganza-api`) | project `eleganza-ar`, `asia-southeast1`, `https://eleganza-api-439528178601.asia-southeast1.run.app` | Pay-per-use on the **credit**; `min=0` `max=4`, 512Mi | On credit; **scale-to-zero** ⇒ ~no idle cost | ⚠ Cold starts (min=0). max=4 caps Cloud SQL connections. |
| **GCP – Cloud SQL (Postgres 17)** | Primary DB (`elz-pg`) | project `eleganza-ar`, ENTERPRISE `db-f1-micro`, 10 GB, zonal, `asia-southeast1`; conn `eleganza-ar:asia-southeast1:elz-pg` | Pay-as-you-go on the **credit** | **⚠ ~24/7 = steady burn** | ⚠ Biggest ongoing cost. `--no-backup`. Stop/start between demos to save credit. |
| **GCP – Secret Manager** | Prod secrets | project `eleganza-ar`: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `BREVO_API_KEY`, `GOOGLE_OAUTH_CLIENT_SECRET` | Pay-as-you-go | Tiny (per-secret/version + access) | — |
| **GCP – Artifact Registry** | Backend images | project `eleganza-ar`, repo `eleganza-backend` (`asia-southeast1`) | Pay-as-you-go | Tiny (image storage) | — |
| **GCP – Cloud Storage** | All media (images, `.glb`, `.mind`, `.apk`) | project `eleganza-ar` (`439528178601`), bucket `eleganza-ar-media-439528178601`, region `asia-southeast1`, STANDARD | Pay-as-you-go on the **credit** | On credit (free until credit runs out) | ⚠ Storage ≈ **0.85 GB** (46 objects). Egress + Class-A/B ops are billable; AR/GLB downloads = egress. 7-day soft-delete keeps deleted bytes billable for the window. |
| **GCP – IAM / IAM Credentials** | Service accounts + keyless signed-URL signing | project `eleganza-ar`; runtime SA `eleganza-run@eleganza-ar.iam.gserviceaccount.com` (signs via IAM signBlob), storage signer `eleganza-storage@…` | — | Free | — |
| **Google OAuth** | Social login | OAuth client `409741672143-…` (separate project `409741672143`, reused) | Free | Free | ⚠ Set frontend origins/redirects in Phase 5. |
| **Brevo** | Transactional email (password reset) via HTTP API | `BREVO_API_KEY` (Secret Manager + `.env`); sender `yhwoo516@gmail.com` | Free (300 emails/day) | Free | Authorized-IP enforcement **deactivated for API keys** (so Cloud Run's dynamic egress can send; no Cloud NAT). |
| **Neon** | Legacy Postgres DB — **rollback net** | `DATABASE_URL` (Neon, in `.env` only) | Free/launch tier (verify) | Free (verify) | Replaced by Cloud SQL (Phase 4); kept intact as rollback. Decommission after the demo is stable. |
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
| ~~Cloud Run / Cloud SQL / Secret Manager / Artifact Registry~~ | 4 | ✅ Done — now in Active services above | Cloud SQL ~24/7 is the main ongoing draw |
| **Firebase Hosting** | 5 | Frontend (HTTPS, required for web AR) | Free tier generous; egress beyond it bills to the GCP project. |
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
