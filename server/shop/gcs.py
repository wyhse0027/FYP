from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from google.cloud import storage


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
