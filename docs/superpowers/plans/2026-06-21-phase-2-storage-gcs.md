# Phase 2 — GCS Storage + Upload Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-developmen
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all application media in one Google Cloud Storage bucket, replace the
R2 direct-upload path with verified GCS signed uploads, and close the storage authorization
and upload-validation findings.

**Architecture:** Django's default storage becomes GCS and the explicit Cloudinary/R2
bindings on `ARExperience` are removed through a schema migration. A small provider-neutral
upload policy and GCS gateway generate 15-minute V4 PUT URLs, sign an upload claim, and verify
the resulting object's key, size, content type, and generation before linking it to a model.
Existing Cloudinary/R2 objects are copied without changing their database names, recorded in
a checksum manifest, verified, and retained until the owner approves source deletion.

**Tech Stack:** Django 5.2, DRF 3.16, django-storages 1.14.6,
google-cloud-storage 3.1.1, pytest 8.4.1, pytest-django 4.11.1, React 19 (CRA), GCS V4
signed URLs, Google Cloud IAM.

---

## Governing Requirements and Findings

- **NFR-4:** one GCS provider for all media; direct signed upload for large files.
- **FR-13:** direct-to-storage `.glb` / `.apk` upload with finalize and delete behavior.
- **§8 #2:** replace both Cloudinary and R2, including explicit per-field bindings and data.
- **§8 #11:** presign/finalize/delete must be admin-only; finalize must verify the object.
- **§8 #12:** legacy AR marker/GLB/MIND delete views must be admin-only.
- **§8 #16:** review media needs server-side size/type validation before public storage.

## Approved Execution Constraints

- Planning happens on `main`; no Phase 2 branch or implementation begins until Task 0 is
  owner-confirmed complete.
- Execution branch: `phase-2-storage-gcs`, created from updated `main` after Task 0.
- Every code task follows RED → GREEN → full relevant test run → diff self-review → owner
  approval → one Conventional Commit.
- No live Cloudinary/R2/GCS/database mutation without a separate owner checkpoint.
- Never print or commit a credential. `server/backend/.env` remains ignored. The downloaded
  service-account key lives outside the repository and is replaced by attached service-accoun
  credentials/ADC when Cloud Run is implemented.
- Existing source objects are not deleted during migration. Their deletion is a separate
  post-verification owner decision.

## Proposed Policy Decisions Included in This Plan

Approval of this plan approves these concrete defaults:

| Decision | Recommendation | Reason |
|---|---|---|
| Project ID | `eleganza-ar`; if unavailable, stop for an owner-selected suffix | Project IDs are globally unique and immutable |
| Bucket name | `eleganza-ar-media-<PROJECT_NUMBER>` | Globally unique, stable, and tied to the project |
| Region/class | `asia-southeast1` (Singapore), `STANDARD` | Nearest established GCP region to Malaysia; align later Cloud Run/SQL resources |
| Access control | Uniform bucket-level access | One IAM policy; no per-object ACL drift |
| Read policy | Public object reads via `allUsers:roles/storage.objectViewer` | Current SPA/APK/AR URLs require stable anonymous GET/HEAD URLs |
| Write identity | `eleganza-storage@<PROJECT_ID>.iam.gserviceaccount.com` with bucket-scoped `roles/storage.objectAdmin` | Create/read/update/delete objects without project-wide Storage Admin |
| Signed upload expiry | 15 minutes | Matches the current R2 window and limits replay |
| Large-file limits | GLB 50 MiB; APK 500 MiB | Covers the 11.5 MiB optimized GLB and current 417,778,852-byte APK |
| Review limits | Images 10 MiB; videos 50 MiB | Demo-grade protection for publicly served user uploads |
| Upload endpoint | Rename `/uploads/r2-presign/` to provider-neutral `/uploads/presign/` | Avoid another provider-specific API migration |

**Public-read consequence:** every object in this single bucket is anonymously readable if
its name is known. No secrets, private documents, migration manifests, or service-accoun
keys may be stored in this bucket. If the owner rejects this policy, stop and redesign the
application around signed GET URLs before implementation.

## File Structure

- `server/backend/settings.py` — configure the GCS default storage and remove active
  Cloudinary/R2 settings after migration.
- `server/backend/settings_test.py` — isolate automated tests from live Neon and live storage.
- `server/backend/.env.sample` — document GCS variable names only.
- `server/requirements.txt` — add GCS + pytest dependencies; remove legacy provider packages
  only after migration succeeds.
- `server/pytest.ini` — point pytest-django at isolated settings.
- `server/shop/models.py` — remove explicit Cloudinary/R2 field storage bindings.
- `server/shop/migrations/0032_alter_arexperience_storage_fields.py` — serialize the field
  storage change.
- `server/shop/upload_policy.py` — pure validation, upload limits, and signed claim handling.
- `server/shop/gcs.py` — narrow wrapper around the Google Cloud Storage SDK.
- `server/shop/views_upload.py` — provider-neutral admin-only presign/finalize/delete views.
- `server/shop/views.py` — admin-gate legacy AR delete endpoints.
- `server/shop/urls.py` — expose `/uploads/presign/`.
- `server/shop/serializers.py` — validate review media before creating storage objects.
- `server/shop/management/commands/migrate_media_to_gcs.py` — dry-run/copy/verify/rollback
  command with JSONL manifest.
- `server/shop/tests/` — focused pytest coverage for every backend behavior above.
- `web/src/pages/admin/AdminAREditPage.js` — use the provider-neutral upload contract.
- `.gitignore` — ignore local migration manifests.
- `context.md`, `progress.md`, `task_plan.md` — align configuration, evidence, and phase state.

---

### Task 0: Owner Creates the GCP Project, Bucket, IAM Identity, Key, and CORS

**Requirement refs:** NFR-4, FR-13, §8 #2, #11
**Files touched:** none in the repository
**Test approach:** read-only `gcloud` describe/list commands; no application tests
**Rollback point:** before branch creation; owner may delete the new key, bucket, and projec
if they contain no migrated data

**Responsibility split**

| Owner performs in Console/Cloud Shell | Codex performs later in code |
|---|---|
| Create/link project, enable APIs, create bucket, decide public read, configure IAM/CORS, create local key | Add GCS dependency/settings, signed URL code, validation, tests, migration command, and env-shape docs |
| Store the JSON key outside the repo and report only project/bucket/service-account identifiers | Never inspect or print the JSON key; consume only its path through `GOOGLE_APPLICATION_CREDENTIALS` |

- [ ] **Step 1: Sign in and select the billing account containing the credit**

Console: open [Cloud Billing](https://console.cloud.google.com/billing), identify the billing
account with the credit, and copy only its non-secret billing account ID.

Cloud Shell / PowerShell alternative:

```powershell
gcloud auth login
gcloud billing accounts lis
```

Expected: the intended billing account is `OPEN=True`.

- [ ] **Step 2: Create the dedicated project and link billing**

```powershell
$PROJECT_ID = "eleganza-ar"
$BILLING_ACCOUNT_ID = Read-Host "Billing account ID shown by gcloud billing accounts list"
gcloud projects create $PROJECT_ID --name="Eleganza AR"
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID
gcloud config set project $PROJECT_ID
```

Never paste the billing account ID into source files. If `eleganza-ar` is unavailable, stop
and ask the owner for the final ID; do not silently add a suffix.

Verify:

```powershell
gcloud projects describe $PROJECT_ID --format="yaml(projectId,projectNumber,lifecycleState)"
gcloud billing projects describe $PROJECT_ID
```

Expected: `lifecycleState: ACTIVE` and billing is enabled on the intended account.

- [ ] **Step 3: Enable the APIs needed now and by attached-identity signing later**

```powershell
gcloud services enable storage.googleapis.com iam.googleapis.com iamcredentials.googleapis.com --project=$PROJECT_ID
gcloud services list --enabled --project=$PROJECT_ID --filter="NAME:(storage.googleapis.com iam.googleapis.com iamcredentials.googleapis.com)"
```

Expected: all three services are listed.

- [ ] **Step 4: Create the bucket with uniform bucket-level access**

```powershell
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$BUCKET = "eleganza-ar-media-$PROJECT_NUMBER"
gcloud storage buckets create "gs://$BUCKET" --project=$PROJECT_ID --location=asia-southeast1 --default-storage-class=STANDARD --uniform-bucket-level-access
gcloud storage buckets describe "gs://$BUCKET"
```

Expected: location `ASIA-SOUTHEAST1`, class `STANDARD`, and uniform access enabled.

- [ ] **Step 5: Explicitly approve and apply anonymous reads**

In Console: Cloud Storage → Buckets → the new bucket → Permissions. Confirm public access
prevention is not enforced, then grant principal `allUsers` the role **Storage Object Viewer**.

CLI equivalent after confirming public access prevention is not inherited/enforced:

```powershell
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member=allUsers --role=roles/storage.objectViewer
gcloud storage buckets get-iam-policy "gs://$BUCKET"
```

Expected: `allUsers` appears only as `roles/storage.objectViewer`, never as an editor/admin.

- [ ] **Step 6: Create the bucket-scoped service account**

```powershell
$SERVICE_ACCOUNT = "eleganza-storage@$PROJECT_ID.iam.gserviceaccount.com"
gcloud iam service-accounts create eleganza-storage --project=$PROJECT_ID --display-name="Eleganza storage signer"
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$SERVICE_ACCOUNT" --role=roles/storage.objectAdmin
gcloud storage buckets get-iam-policy "gs://$BUCKET"
```

Expected: the service account has `roles/storage.objectAdmin` on this bucket only.

- [ ] **Step 7: Create one local development key outside the repository**

```powershell
$KEY_DIR = Join-Path $HOME ".config\eleganza-ar"
New-Item -ItemType Directory -Force -Path $KEY_DIR
$KEY_PATH = Join-Path $KEY_DIR "storage-signer.json"
gcloud iam service-accounts keys create $KEY_PATH --iam-account=$SERVICE_ACCOUNT --project=$PROJECT_ID
gcloud iam service-accounts keys list --iam-account=$SERVICE_ACCOUNT --managed-by=user
```

Do not open, paste, commit, or upload the JSON. Later, set only this local path in the ignored
`server/backend/.env` as `GOOGLE_APPLICATION_CREDENTIALS`. Cloud Run will use an attached
service account/ADC and this key will then be revoked.

- [ ] **Step 8: Apply bucket CORS**

Create `C:\tmp\eleganza-gcs-cors.json` locally:

```json
[
  {
    "origin": ["http://localhost:3000", "https://gerainchan.vercel.app"],
    "method": ["GET", "HEAD", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Content-Length", "ETag", "x-goog-generation"],
    "maxAgeSeconds": 3600
  }
]
```

Apply and verify:

```powershell
gcloud storage buckets update "gs://$BUCKET" --cors-file="C:\tmp\eleganza-gcs-cors.json"
gcloud storage buckets describe "gs://$BUCKET" --format="yaml(cors_config)"
```

The Firebase Hosting origin is added in Phase 5 after its hostname exists.

- [ ] **Step 9: Owner checkpoint**

Owner reports only: final project ID, project number, bucket name, region, service-accoun
email, enabled API names, uniform-access status, public-read decision, and CORS origins.
Do not report the key ID or JSON contents. **Stop here. No branch or code until the owner says
Task 0 is complete.**

Official references:
[projects](https://cloud.google.com/resource-manager/docs/creating-managing-projects),
[billing](https://cloud.google.com/billing/docs/how-to/modify-project),
[buckets](https://cloud.google.com/storage/docs/creating-buckets),
[uniform access](https://cloud.google.com/storage/docs/uniform-bucket-level-access),
[public reads](https://cloud.google.com/storage/docs/access-control/making-data-public),
[CORS](https://cloud.google.com/storage/docs/using-cors),
[service-account keys](https://cloud.google.com/iam/docs/keys-create-delete), and
[signed URLs](https://cloud.google.com/storage/docs/access-control/signing-urls-with-helpers).

---

## Execution Setup (only after Task 0 confirmation)

- [ ] **Create the phase branch from updated main**

```powershell
git checkout main
git pull --ff-only origin main
git checkout -b phase-2-storage-gcs
```

Expected: `git branch --show-current` prints `phase-2-storage-gcs`.

---

### Task 1: Add an Isolated Pytest Harness and GCS Dependencies

**Requirement refs:** NFR-4, CLAUDE.md §5
**Files:** modify `server/requirements.txt`; delete `server/shop/tests.py`; create
`server/pytest.ini`, `server/backend/settings_test.py`, `server/shop/tests/__init__.py`
**Test approach:** run a sentinel pytest without Neon or external storage access
**Rollback point:** revert this task commit; no external state

- [ ] **Step 1: Add the test settings and sentinel test first**

`server/backend/settings_test.py`:

```python
from .settings import *  # noqa: F403,F401

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
```

`server/pytest.ini`:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = backend.settings_tes
python_files = test_*.py
addopts = -q
```

Replace the empty `server/shop/tests.py` with `server/shop/tests/__init__.py`, then create
`server/shop/tests/test_harness.py`:

```python
from django.conf import settings


def test_suite_uses_isolated_sqlite_and_memory_storage():
    assert settings.DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3"
    assert settings.STORAGES["default"]["BACKEND"].endswith("InMemoryStorage")
```

- [ ] **Step 2: Run RED before installing the new test dependencies**

```powershell
cd server
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_harness.py
```

Expected: FAIL because `pytest`/`pytest-django` is unavailable.

- [ ] **Step 3: Add the approved pins and install them**

Append to `server/requirements.txt`:

```tex
google-cloud-storage==3.1.1
pytest==8.4.1
pytest-django==4.11.1
```

```powershell
..\venv\Scripts\python.exe -X utf8 -m pip install -r requirements.tx
```

- [ ] **Step 4: Run GREEN and the Django system check**

```powershell
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_harness.py
..\venv\Scripts\python.exe -X utf8 manage.py check --settings=backend.settings_tes
```

Expected: 1 test passes; system check reports no errors.

- [ ] **Step 5: Self-review and commit after owner approval**

```powershell
git diff --check
git add server/requirements.txt server/pytest.ini server/backend/settings_test.py server/shop/tests.py server/shop/tests
git commit -m "test(storage): add isolated pytest harness"
```

---

### Task 2: Repoint Default and Per-Field Storage to GCS

**Requirement refs:** NFR-4, §8 #2
**Files:** modify `server/backend/settings.py`, `server/backend/.env.sample`,
`server/shop/models.py`; create `server/shop/tests/test_storage_config.py` and
`server/shop/migrations/0032_alter_arexperience_storage_fields.py`
**Test approach:** configuration/model deconstruction tests plus disposable migration
**Rollback point:** revert this commit; DB migration 0032 is state-only and reversible

- [ ] **Step 1: Write failing storage contract tests**

```python
from django.db.models.fields.files import FileField
from shop.models import ARExperience


def test_production_default_storage_is_gcs():
    from backend import settings as production_settings

    backend = production_settings.STORAGES["default"]["BACKEND"]
    assert backend == "storages.backends.gcloud.GoogleCloudStorage"
    assert production_settings.STORAGES["default"]["OPTIONS"]["querystring_auth"] is False


def test_ar_file_fields_do_not_bind_legacy_storage_classes():
    for name in ("marker_image", "marker_mind", "model_glb", "app_download_file"):
        field = ARExperience._meta.get_field(name)
        _name, _path, _args, kwargs = field.deconstruct()
        assert isinstance(field, FileField)
        assert "storage" not in kwargs
```

- [ ] **Step 2: Run RED**

```powershell
cd server
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_storage_config.py -q
```

Expected: FAIL because production default is Cloudinary and AR fields serialize legacy
storage instances.

- [ ] **Step 3: Configure the default GCS backend**

In `server/backend/settings.py`, replace the Cloudinary default storage with:

```python
GCS_PROJECT_ID = os.getenv("GCS_PROJECT_ID", "")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
        "OPTIONS": {
            "project_id": GCS_PROJECT_ID,
            "bucket_name": GCS_BUCKET_NAME,
            "default_acl": None,
            "querystring_auth": False,
            "file_overwrite": False,
        },
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
```

Keep legacy R2/Cloudinary settings temporarily because Task 7 still needs source access.

Add shape-only variables to `server/backend/.env.sample`:

```dotenv
GCS_PROJECT_ID=eleganza-ar
GCS_BUCKET_NAME=eleganza-ar-media-project-number
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\User\.config\eleganza-ar\storage-signer.json
```

- [ ] **Step 4: Remove all four explicit storage overrides**

In `server/shop/models.py`, remove the Cloudinary/R2 storage imports, `r2_storage`, and the
`storage=` argument from `marker_image`, `marker_mind`, `model_glb`, and
`app_download_file`. Do not change their `upload_to`, nullability, or field types.

- [ ] **Step 5: Generate and inspect the state migration**

```powershell
cd server
..\venv\Scripts\python.exe -X utf8 manage.py makemigrations shop --name alter_arexperience_storage_fields
Get-Content shop\migrations\0032_alter_arexperience_storage_fields.py
```

Expected: only `AlterField` operations for the four `ARExperience` file/image fields; no
column/data operation.

- [ ] **Step 6: Run GREEN and migrate a disposable SQLite database**

```powershell
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_storage_config.py -q
$env:DATABASE_URL = "sqlite:///C:/tmp/eleganza-phase2-migrate.sqlite3"
..\venv\Scripts\python.exe -X utf8 manage.py migrate --noinpu
Remove-Item Env:DATABASE_URL
```

Expected: tests pass and all migrations, including 0032, apply cleanly.

- [ ] **Step 7: Self-review and commit after owner approval**

```powershell
git diff --check
git add server/backend/settings.py server/backend/.env.sample server/shop/models.py server/shop/migrations/0032_alter_arexperience_storage_fields.py server/shop/tests/test_storage_config.py
git commit -m "feat(storage): configure GCS as the sole media backend"
```

---

### Task 3: Add Upload Policy, Signed Claims, and a Testable GCS Gateway

**Requirement refs:** FR-13, §8 #11
**Files:** create `server/shop/upload_policy.py`, `server/shop/gcs.py`,
`server/shop/tests/test_upload_policy.py`, `server/shop/tests/test_gcs_gateway.py`
**Test approach:** pure policy tests; gateway tests patch the unavoidable external SDK edge
**Rollback point:** revert this commit; no endpoint or live object changes

- [ ] **Step 1: Write failing policy tests**

Cover these exact cases in `test_upload_policy.py`:

```python
import pytes
from rest_framework.exceptions import ValidationError
from shop.upload_policy import build_upload_claim, load_upload_claim, validate_upload


def test_glb_policy_accepts_50_mib_boundary():
    result = validate_upload("glb", "model.glb", "model/gltf-binary", 50 * 1024 * 1024)
    assert result.folder == "ar/models"


@pytest.mark.parametrize("size", [0, 50 * 1024 * 1024 + 1])
def test_glb_policy_rejects_invalid_size(size):
    with pytest.raises(ValidationError):
        validate_upload("glb", "model.glb", "model/gltf-binary", size)


def test_claim_round_trip_binds_admin_key_size_and_type():
    token = build_upload_claim(7, "glb", "ar/models/random_model.glb", 1234, "model/gltf-binary")
    claim = load_upload_claim(token)
    assert claim["user_id"] == 7
    assert claim["size"] == 1234
```

Also test invalid kind, path traversal/basename handling, extension/MIME mismatch, APK
500 MiB boundary, expired claim, and claim tampering.

- [ ] **Step 2: Run RED**

```powershell
cd server
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_upload_policy.py -q
```

Expected: collection fails because `shop.upload_policy` does not exist.

- [ ] **Step 3: Implement the immutable policy and signed claim**

`server/shop/upload_policy.py` defines a frozen `UploadSpec`, `UPLOAD_SPECS`,
`validate_upload()`, `build_upload_claim()`, and `load_upload_claim()` using
`django.core.signing` with salt `shop.gcs-upload` and `max_age=900`. Use these limits:

```python
UPLOAD_SPECS = {
    "glb": UploadSpec("ar/models", frozenset({".glb"}),
                      frozenset({"model/gltf-binary", "application/octet-stream"}),
                      50 * 1024 * 1024, "model_glb"),
    "apk": UploadSpec("ar/apk", frozenset({".apk"}),
                      frozenset({"application/vnd.android.package-archive", "application/octet-stream"}),
                      500 * 1024 * 1024, "app_download_file"),
}
```

`validate_upload()` must reject unknown kinds, empty/oversized files, path components,
wrong extensions, and content types outside the exact allowlist. It returns the matching
spec; it never silently converts an invalid MIME type to octet-stream.

- [ ] **Step 4: Write the failing gateway contract test**

The test patches `google.cloud.storage.Client`, calls `GCSGateway.create_signed_put()`, and
asserts `generate_signed_url` receives `version="v4"`, `method="PUT"`, 15-minute expiry,
the exact content type, and `headers={"Content-Length": "1234"}`. Tests for `stat()` asser
the returned immutable object contains `name`, `size`, `content_type`, and `generation`.

- [ ] **Step 5: Implement the narrow SDK gateway**

`server/shop/gcs.py` implements the complete SDK boundary:

```python
from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from google.cloud import storage


@dataclass(frozen=True)
class StoredObject:
    name: str
    size: in
    content_type: str
    generation: in


class GCSGateway:
    def __init__(self, client=None):
        self.client = client or storage.Client(project=settings.GCS_PROJECT_ID)
        self.bucket = self.client.bucket(settings.GCS_BUCKET_NAME)

    def create_signed_put(self, key: str, size: int, content_type: str) -> str:
        return self.bucket.blob(key).generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            content_type=content_type,
            headers={"Content-Length": str(size)},
        )

    def stat(self, key: str) -> StoredObject | None:
        blob = self.bucket.blob(key)
        if not blob.exists(client=self.client):
            return None
        blob.reload(client=self.client)
        return StoredObject(
            name=blob.name,
            size=int(blob.size),
            content_type=blob.content_type or "",
            generation=int(blob.generation),
        )

    def delete(self, key: str, generation: int | None = None) -> None:
        options = {"if_generation_match": generation} if generation is not None else {}
        self.bucket.blob(key).delete(client=self.client, **options)

    def public_url(self, key: str) -> str:
        bucket = quote(settings.GCS_BUCKET_NAME, safe="")
        object_name = quote(key, safe="/")
        return f"https://storage.googleapis.com/{bucket}/{object_name}"
```

The service-account key/ADC supplies signing credentials; no credential value is passed to
or returned by this class.

**Browser compatibility guard:** signing `Content-Length` requires the browser's automatic
PUT header to match the declared byte count exactly. Task 8 must test this in the real browser.
If the PUT returns a signature-mismatch 403 and the signed `Content-Length` is confirmed as
the cause, remove that header from `generate_signed_url()` and its gateway assertion; retain
the presign size limit and the finalize-time exact `stat().size` check. Do not weaken both
layers.

- [ ] **Step 6: Run GREEN and commit after self-review/approval**

```powershell
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_upload_policy.py shop\tests\test_gcs_gateway.py -q
git diff --check
git add server/shop/upload_policy.py server/shop/gcs.py server/shop/tests/test_upload_policy.py server/shop/tests/test_gcs_gateway.py
git commit -m "feat(storage): add verified GCS upload primitives"
```

Expected: all policy and gateway tests pass.

---

### Task 4: Port Presign/Finalize/Delete and Enforce Admin Authorization

**Requirement refs:** FR-13, §8 #11, #12
**Files:** modify `server/shop/views_upload.py`, `server/shop/views.py`, `server/shop/urls.py`;
create `server/shop/tests/test_upload_views.py`, `server/shop/tests/test_ar_delete_permissions.py`
**Test approach:** DRF API tests with real auth/DB and a fake gateway injected only at the SDK boundary
**Rollback point:** revert this commit; old endpoint/code restored, no live object changes

- [ ] **Step 1: Write RED permission tests**

For presign, finalize, big-file delete, marker delete, GLB delete, and MIND delete, assert:

- anonymous request → 401;
- authenticated `role="user", is_staff=False` → 403;
- authenticated `is_staff=True` admin → reaches validation/business logic.

Run:

```powershell
cd server
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_upload_views.py shop\tests\test_ar_delete_permissions.py -q
```

Expected: user requests currently pass the R2 views and legacy deletes, so RED failures prove
the authorization gap.

- [ ] **Step 2: Write RED presign contract tests**

POST `/api/uploads/presign/` with `kind`, `filename`, `content_type`, and `size`. Assert the
200 response is exactly `upload_url`, `public_url`, `key`, and `upload_token`; assert the key
is under the policy folder and contains a random UUID. Invalid size/type/name returns 400 and
does not call the gateway.

- [ ] **Step 3: Write RED finalize verification tests**

PATCH `/api/ar/<pk>/finalize-bigfile/` with `kind`, `key`, and `upload_token`. Cover:

- missing/tampered/expired token → 400;
- token belongs to another admin → 400;
- missing object → 400 and DB unchanged;
- size or content-type mismatch → candidate object deleted by generation and DB unchanged;
- matching object → field name updated to the key;
- repeated finalize with the same key → idempotent 200;
- a key outside the signed claim/prefix → 400.

- [ ] **Step 4: Implement provider-neutral admin-only views**

Replace boto3/R2 code in `views_upload.py` with `GCSGateway` and the Task 3 policy. Every
view uses `permission_classes = [IsAdminUser]`. Presign signs the authenticated admin ID and
declared object facts. Finalize loads the claim, compares every request/object fact, and only
then saves the field. Delete validates the stored prefix and uses generation-guarded deletion
before clearing the field.

In `views.py`, add `permission_classes = [permissions.IsAdminUser]` to
`ARDeleteMarkerView`, `ARDeleteGLBView`, and `ARDeleteMindView`.

In `urls.py`, replace only the provider-specific presign route:

```python
path("uploads/presign/", PresignBigFile.as_view(), name="presign-bigfile")
```

Keep finalize/delete URLs stable.

- [ ] **Step 5: Run GREEN and the complete backend suite**

```powershell
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests -q
```

Expected: all tests pass; no live GCS calls occur under test settings.

- [ ] **Step 6: Self-review and commit after owner approval**

```powershell
git diff --check
git add server/shop/views_upload.py server/shop/views.py server/shop/urls.py server/shop/tests/test_upload_views.py server/shop/tests/test_ar_delete_permissions.py
git commit -m "fix(storage): verify and admin-gate direct uploads"
```

---

### Task 5: Update the Admin SPA to the Provider-Neutral Upload Contrac

**Requirement refs:** FR-13, NFR-4
**Files:** modify `web/src/pages/admin/AdminAREditPage.js`
**Test approach:** frontend build plus documented browser PUT/finalize check in Task 8
**Rollback point:** revert this commit with Task 4 if the backend route is rolled back

- [ ] **Step 1: Make the contract change**

Rename R2-specific helpers/messages to provider-neutral names. Presign must send `size` and
retain the returned token:

```javascrip
async function presignBigFile(kind, file) {
  const res = await http.post("/uploads/presign/", {
    kind,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.size,
  });
  return res.data;
}

async function uploadBigFile(kind, file) {
  const { upload_url, key, upload_token } = await presignBigFile(kind, file);
  const response = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) throw new Error(`Storage upload failed: ${response.status}`);
  return { key, upload_token };
}

async function finalizeBigFile(arId, kind, upload) {
  await http.patch(`/ar/${arId}/finalize-bigfile/`, {
    kind,
    key: upload.key,
    upload_token: upload.upload_token,
  });
}
```

Replace all visible “R2” text with “cloud storage”. Preserve the existing create/edit order.

- [ ] **Step 2: Run build verification**

```powershell
cd web
$env:CI = "false"
npm run build
Remove-Item Env:CI
```

Expected: production build exits 0. The browser PUT/finalize behavior is manually verified
in Task 8 under the repository's hybrid UI/file-upload rule; unrelated Phase 3 Jest baseline
debt is not changed here.

- [ ] **Step 3: Self-review and commit after owner approval**

```powershell
git diff --check
git add web/src/pages/admin/AdminAREditPage.js
git commit -m "feat(storage): use GCS direct-upload contract"
```

---

### Task 6: Validate Review Media Before Public Storage

**Requirement refs:** §8 #16, NFR-4
**Files:** modify `server/shop/serializers.py`; create
`server/shop/tests/test_review_upload_validation.py`
**Test approach:** serializer/API tests with in-memory uploaded files and in-memory storage
**Rollback point:** revert this commit; no schema or external state

- [ ] **Step 1: Write RED tests**

Use `SimpleUploadedFile` to prove:

- JPEG/PNG/WebP up to 10 MiB are accepted as `IMAGE`;
- MP4/WebM up to 50 MiB are accepted as `VIDEO`;
- empty, oversized, executable/HTML, extension/MIME mismatch, and more than five files are
  rejected before `ReviewMedia.objects.create()`;
- create and update use the same validation path.

Run:

```powershell
cd server
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_review_upload_validation.py -q
```

Expected: current serializer accepts the invalid fixtures, so tests fail.

- [ ] **Step 2: Implement one reusable validator**

Add constants and `validate_review_file(upload)` in `serializers.py`. Use exact allowlists:

```python
REVIEW_IMAGE_TYPES = {"image/jpeg": {".jpg", ".jpeg"}, "image/png": {".png"}, "image/webp": {".webp"}}
REVIEW_VIDEO_TYPES = {"video/mp4": {".mp4"}, "video/webm": {".webm"}}
REVIEW_IMAGE_MAX_BYTES = 10 * 1024 * 1024
REVIEW_VIDEO_MAX_BYTES = 50 * 1024 * 1024
REVIEW_MAX_FILES = 5
```

Return `IMAGE`/`VIDEO` from the validator and use that result in both `create()` and
`update()` rather than re-inferring from untrusted MIME after validation.

- [ ] **Step 3: Run GREEN and commit after review/approval**

```powershell
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_review_upload_validation.py -q
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests -q
git diff --check
git add server/shop/serializers.py server/shop/tests/test_review_upload_validation.py
git commit -m "fix(reviews): validate public media uploads"
```

Expected: targeted and full backend suites pass.

---

### Task 7: Build the Checksum-Manifest Migration Command

**Requirement refs:** NFR-4, §8 #2
**Files:** create `server/shop/management/__init__.py`,
`server/shop/management/commands/__init__.py`,
`server/shop/management/commands/migrate_media_to_gcs.py`,
`server/shop/tests/test_media_migration.py`; modify `.gitignore`
**Test approach:** fake legacy/GCS stores and temporary files; no live provider calls
**Rollback point:** revert this commit; command defaults to dry-run

- [ ] **Step 1: Write RED command tests**

Tests must prove:

- default invocation is dry-run and writes/copies nothing;
- inventory covers every non-empty `FileField`/`ImageField` in the model map;
- Cloudinary fields and R2 AR fields select the correct legacy source adapter;
- source bytes are spooled, MD5-calculated, uploaded under the unchanged database key, and
  compared with GCS `md5_hash`/size;
- a destination collision with a different checksum stops before DB/source mutation;
- rerunning a matching row is idempotent (`verified_existing`);
- each JSONL row contains model, PK, field, source provider/key, destination key, bytes,
  MD5, GCS generation, status, and timestamp;
- `--rollback-manifest` deletes only generations created by that manifest and never deletes
  Cloudinary/R2 source objects.

- [ ] **Step 2: Run RED**

```powershell
cd server
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_media_migration.py -q
```

Expected: FAIL because the command does not exist.

- [ ] **Step 3: Implement the explicit field map and safe command modes**

The command exposes:

```tex
python manage.py migrate_media_to_gcs --manifest <path> --dry-run
python manage.py migrate_media_to_gcs --manifest <path> --execute
python manage.py migrate_media_to_gcs --rollback-manifest <path>
```

`--dry-run` and `--execute` are mutually exclusive; omission means dry-run. Preserve each
database field name as the destination key so application rows do not need rewriting. Stream
each source to a temporary file, calculate MD5/bytes, upload, reload GCS metadata, and append
the manifest row only after verification. Flush each JSONL row immediately so interruption
leaves a resumable record. Import boto3/Cloudinary adapters lazily only in inventory/copy
mode; `--rollback-manifest` must require only the GCS dependency.

Add to `.gitignore`:

```gitignore
migration-manifests/
```

Manifests stay local/private and are never uploaded into the public media bucket.

- [ ] **Step 4: Run GREEN and verify command help**

```powershell
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests\test_media_migration.py -q
..\venv\Scripts\python.exe -X utf8 manage.py migrate_media_to_gcs --help
```

Expected: tests pass; help lists dry-run, execute, manifest, and rollback modes.

- [ ] **Step 5: Self-review and commit after owner approval**

```powershell
git diff --check
git add .gitignore server/shop/management server/shop/tests/test_media_migration.py
git commit -m "feat(storage): add checksummed GCS migration command"
```

---

### Task 8: Live Migration, Direct-Upload, CORS, and Asset Verification

**Requirement refs:** NFR-4, FR-13, §8 #2, #11, #16
**Files/data:** create ignored `migration-manifests/*.jsonl`; append `progress.md`; copy
live Cloudinary/R2 objects to GCS; no source deletion
**Test approach:** dry-run reconciliation, checksums, API/browser checks, representative UI/AR files
**Rollback point:** manifest generation IDs + previous phase tag; rollback command removes only
new GCS generations while source services and DB names remain intac

- [ ] **Step 1: Stop for explicit live-write approval**

Present the dry-run object count, total bytes by provider, collision count, missing-source
count, destination bucket, and manifest path. Do not run `--execute` until the owner approves.

- [ ] **Step 2: Run and review the dry run**

```powershell
cd server
$MANIFEST = "..\migration-manifests\phase-2-gcs.jsonl"
..\venv\Scripts\python.exe -X utf8 manage.py migrate_media_to_gcs --manifest $MANIFEST --dry-run
```

Expected: zero missing sources and zero conflicting destination keys. Otherwise stop.

- [ ] **Step 3: Execute after approval and reconcile**

```powershell
..\venv\Scripts\python.exe -X utf8 manage.py migrate_media_to_gcs --manifest $MANIFEST --execute
..\venv\Scripts\python.exe -X utf8 manage.py migrate_media_to_gcs --manifest $MANIFEST --dry-run
```

Expected: every row is `copied_verified` or `verified_existing`; second run reports no work.

- [ ] **Step 4: Verify both direct-upload policies with disposable objects**

As an admin in the browser, upload a small valid GLB and a small valid APK fixture, confirm
PUT + finalize success, then delete those disposable records/objects through the admin UI.
Attempt as a normal user and record 403 for presign/finalize/delete. Attempt one oversize
declared request and one invalid MIME request and record 400 before any signed URL is issued.

- [ ] **Step 5: Verify representative migrated assets manually**

Record HTTP status/content length/content type plus UI rendering for:

1. avatar;
2. product promo/card image;
3. product gallery image/video;
4. AR marker image and `.mind` file;
5. both 11.5 MiB optimized GLBs in web AR (render + animation);
6. APK download;
7. review image/video;
8. About/persona/retailer images.

Use browser-origin requests for CORS checks. Confirm anonymous GET/HEAD succeeds and anonymous
PUT/DELETE does not. Confirm no response URL points to Cloudinary or R2.

- [ ] **Step 6: Record evidence and commit only the log**

Append object counts, bytes, manifest path (not contents), checksum reconciliation, CORS
origins, direct-upload checks, and manual matrix results to `progress.md`.

```powershell
git add progress.md
git commit -m "test(storage): record GCS migration verification"
```

Keep all Cloudinary/R2 objects and credentials until the phase review and owner deletion
decision.

---

### Task 9: Retire Active Legacy Storage Configuration and Align Documentation

**Requirement refs:** NFR-4, §8 #2
**Files:** modify `server/backend/settings.py`, `server/backend/.env.sample`,
`server/backend/r2_storage.py`, `context.md`, `task_plan.md`, `progress.md`; retain
`server/requirements.txt` legacy packages and the migration command for migration compatibility
**Test approach:** secret/provider grep, full backend tests, frontend build, Django check
**Rollback point:** revert this commit; old providers remain physically intac

- [ ] **Step 1: Remove active legacy configuration but retain migration compatibility**

After Task 8 passes, remove R2/AWS and Cloudinary settings from `settings.py` and their shape
variables from `.env.sample`. Do **not** delete `backend/r2_storage.py` or remove `boto3`,
`botocore`, `s3transfer`, `cloudinary`, or `django-cloudinary-storage`: historical migration
`shop/migrations/0031_*.py` imports those modules/classes, and removing them breaks a fresh
database migration. Mark `r2_storage.py` as a migration-compatibility shim with no active
model/settings references. Those packages can be removed only after a separately approved
migration squash.

The runtime storage path must contain no Cloudinary/R2 reference even though compatibility
packages remain installed.

- [ ] **Step 2: Update canonical docs**

- `context.md`: mark NFR-4/issue #2 and storage findings #11/#12/#16 resolved; describe the
  GCS env contract, public-read decision, signed-upload verification, and retained-source
  rollback state.
- `task_plan.md`: mark Phase 2 complete only after Task 10 review.
- `progress.md`: record dependency/config removal and whether source deletion is deferred.

- [ ] **Step 3: Run provider-removal and full verification**

```powershell
rg -n "Cloudinary|cloudinary|R2_|AWS_S3|boto3|r2-presign" server web --glob "!shop/management/commands/migrate_media_to_gcs.py"
cd server
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests -q
..\venv\Scripts\python.exe -X utf8 manage.py check --settings=backend.settings_tes
$env:DATABASE_URL = "sqlite:///C:/tmp/eleganza-phase2-fresh.sqlite3"
..\venv\Scripts\python.exe -X utf8 manage.py migrate --noinpu
Remove-Item Env:DATABASE_URL
cd ..\web
$env:CI = "false"
npm run build
Remove-Item Env:CI
```

Expected: grep results are limited to historical migrations, the compatibility shim, the
migration command, and recorded docs; all tests/check/fresh migrations/build pass.

- [ ] **Step 4: Self-review and commit after owner approval**

```powershell
git diff --check
git add server/backend/settings.py server/backend/.env.sample server/backend/r2_storage.py context.md task_plan.md progress.md
git commit -m "chore(storage): retire legacy storage configuration"
```

---

### Task 10: Phase Review, Source-Deletion Decision, Merge, and Tag

**Requirement refs:** NFR-4, FR-13, §8 #2, #11, #12, #16; CLAUDE.md §6
**Files:** review branch diff; modify docs only for review findings/owner decisions
**Test approach:** full fresh verification plus formal code and security reviews
**Rollback point:** `phase-1-web-ar` tag before merge; Phase 2 annotated tag after approval

- [ ] **Step 1: Run fresh final verification**

```powershell
cd server
..\venv\Scripts\python.exe -X utf8 -m pytest shop\tests -q
..\venv\Scripts\python.exe -X utf8 manage.py check --settings=backend.settings_tes
cd ..\web
$env:CI = "false"
npm run build
Remove-Item Env:CI
git diff --check main...HEAD
```

Expected: zero test/build/check failures.

- [ ] **Step 2: Run formal reviews**

Run the required code review and security review over `main...phase-2-storage-gcs`, specifically
checking IAM scope, public exposure, signed claim replay, authorization, object verification,
generation-safe deletion, upload limits, manifest secrecy, and secret leakage. Fix or explicitly
justify every finding with tests.

- [ ] **Step 3: Owner decides legacy-source retention/deletion**

Present Cloudinary/R2 object counts and bytes, GCS checksum reconciliation, rollback effects,
and provider costs. Deleting legacy objects/credentials is a new external write and requires
explicit approval. If deferred, record the retention deadline/owner decision without claiming
the providers are fully decommissioned.

- [ ] **Step 4: Stop for merge/tag approval**

Do not merge, tag, push, delete legacy sources, or revoke legacy credentials until the owner
approves each action.

- [ ] **Step 5: Merge and tag only after approval**

```powershell
git checkout main
git merge --no-ff phase-2-storage-gcs -m "merge: Phase 2 — GCS storage and upload hardening"
git tag -a phase-2-storage-gcs -m "Phase 2 complete: GCS migration and hardened uploads"
git push origin main --tags
```

---

## Self-Review

- **Spec coverage:** Task 0 provisions the prerequisite; Tasks 1–2 cover GCS/default/per-field
  migration; Tasks 3–5 cover signed direct uploads and #11/#12; Task 6 covers #16; Tasks 7–8
  cover checksummed data migration/rollback/manual assets; Tasks 9–10 cover provider removal,
  docs, reviews, and phase controls.
- **No live-write ambiguity:** Task 0 is owner-operated; Task 8 and source deletion each have
  explicit stop points. Task 0 must finish before branch creation.
- **Rollback:** source objects remain intact; database object names are preserved; the manifes
  records destination generations; every code task is independently revertible.
- **Placeholder scan:** no implementation placeholder remains. Values not knowable before
  provisioning are generated by explicit commands; an unavailable project ID is a stop condition.
- **Type/name consistency:** `UploadSpec`, `StoredObject`, `GCSGateway`, `upload_token`, and the
  provider-neutral endpoint names are consistent across backend, tests, and frontend tasks.
