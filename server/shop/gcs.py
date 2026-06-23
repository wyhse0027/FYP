from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from google.auth import credentials as google_credentials
from google.auth import default as google_auth_default
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.cloud import storage


_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


@dataclass(frozen=True)
class StoredObject:
    name: str
    size: int
    content_type: str
    generation: int


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
            **self._signing_credentials(),
        )

    def _signing_credentials(self) -> dict:
        """Kwargs that let generate_signed_url produce a V4 signature.

        Local dev uses a service-account JSON key (GOOGLE_APPLICATION_CREDENTIALS)
        whose credentials can sign locally, so no extra kwargs are needed. On Cloud
        Run the attached service account has no private key, so the URL is signed via
        the IAM signBlob API by passing the service account email and a fresh access
        token (requires roles/iam.serviceAccountTokenCreator on the SA itself).

        The token is fetched with the cloud-platform scope: the storage client's own
        credentials are scoped to devstorage and would be rejected by signBlob with
        ACCESS_TOKEN_SCOPE_INSUFFICIENT.
        """
        credentials, _ = google_auth_default(scopes=[_CLOUD_PLATFORM_SCOPE])
        if isinstance(credentials, google_credentials.Signing):
            return {}
        credentials.refresh(GoogleAuthRequest())
        return {
            "service_account_email": credentials.service_account_email,
            "access_token": credentials.token,
        }

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
