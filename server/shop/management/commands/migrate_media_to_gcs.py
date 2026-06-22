import base64
import hashlib
import json
import os
import tempfile
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


@dataclass(frozen=True)
class FieldMapEntry:
    model: str
    field: str
    source_provider: str


@dataclass(frozen=True)
class InventoryItem:
    model: str
    pk: object
    field: str
    source_provider: str
    source_key: str
    dest_key: str


FIELD_MAP = (
    FieldMapEntry("shop.User", "avatar", "cloudinary"),
    FieldMapEntry("shop.Product", "promo_image", "cloudinary"),
    FieldMapEntry("shop.Product", "card_image", "cloudinary"),
    FieldMapEntry("shop.ProductMedia", "file", "cloudinary"),
    FieldMapEntry("shop.ARExperience", "marker_image", "cloudinary"),
    FieldMapEntry("shop.ARExperience", "marker_mind", "r2"),
    FieldMapEntry("shop.ARExperience", "model_glb", "r2"),
    FieldMapEntry("shop.ARExperience", "app_download_file", "r2"),
    FieldMapEntry("shop.ScentPersona", "image", "cloudinary"),
    FieldMapEntry("shop.ScentPersona", "cover_image", "cloudinary"),
    FieldMapEntry("shop.ReviewMedia", "file", "cloudinary"),
    FieldMapEntry("shop.SiteAbout", "hero_image", "cloudinary"),
    FieldMapEntry("shop.Retailer", "image", "cloudinary"),
)


class CloudinarySourceStore:
    def __init__(self):
        from cloudinary_storage.storage import MediaCloudinaryStorage

        self.storage = MediaCloudinaryStorage()

    def open(self, key):
        return self.storage.open(key, "rb")


class R2SourceStore:
    def __init__(self):
        import boto3

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name="auto",
        )

    def open(self, key):
        response = self.client.get_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
        return response["Body"]


class Command(BaseCommand):
    help = "Copy legacy Cloudinary/R2 media to GCS with checksum manifests."

    def add_arguments(self, parser):
        modes = parser.add_mutually_exclusive_group()
        modes.add_argument(
            "--dry-run",
            action="store_true",
            help="Inventory media without copying or writing a manifest (default).",
        )
        modes.add_argument(
            "--execute",
            action="store_true",
            help="Copy and verify media; requires --manifest.",
        )
        modes.add_argument(
            "--rollback-manifest",
            metavar="PATH",
            help="Delete only GCS generations created by the supplied manifest.",
        )
        parser.add_argument(
            "--manifest",
            metavar="PATH",
            help="Private local JSONL manifest path for dry-run/execute mode.",
        )

    def handle(self, *args, **options):
        rollback_path = options.get("rollback_manifest")
        manifest_path = options.get("manifest")

        if rollback_path:
            if manifest_path:
                raise CommandError("--manifest cannot be combined with --rollback-manifest")
            self.rollback_manifest(Path(rollback_path))
            return

        if options.get("execute"):
            if not manifest_path:
                raise CommandError("--execute requires --manifest")
            self.execute_migration(Path(manifest_path))
            return

        count = sum(1 for _item in self.iter_inventory())
        self.stdout.write(
            self.style.WARNING(
                f"Dry run: found {count} media objects; no sources, GCS objects, or manifests changed."
            )
        )

    def iter_inventory(self):
        for entry in FIELD_MAP:
            model = apps.get_model(entry.model)
            for instance in model._default_manager.all().iterator():
                field_file = getattr(instance, entry.field)
                key = (getattr(field_file, "name", "") or "").strip()
                if not key:
                    continue
                yield InventoryItem(
                    model=entry.model,
                    pk=instance.pk,
                    field=entry.field,
                    source_provider=entry.source_provider,
                    source_key=key,
                    dest_key=key,
                )

    def get_source_store(self, provider):
        if provider == "cloudinary":
            return CloudinarySourceStore()
        if provider == "r2":
            return R2SourceStore()
        raise CommandError(f"Unsupported source provider: {provider}")

    def get_bucket(self):
        from google.cloud import storage

        client = storage.Client(project=settings.GCS_PROJECT_ID)
        return client.bucket(settings.GCS_BUCKET_NAME)

    def execute_migration(self, manifest_path):
        bucket = self.get_bucket()
        source_stores = {}

        for inventory_item in self.iter_inventory():
            source_store = source_stores.get(inventory_item.source_provider)
            if source_store is None:
                source_store = self.get_source_store(inventory_item.source_provider)
                source_stores[inventory_item.source_provider] = source_store

            with (
                closing(source_store.open(inventory_item.source_key)) as source,
                tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024, mode="w+b") as spool,
            ):
                digest = hashlib.md5()
                byte_count = 0
                while True:
                    chunk = source.read(1024 * 1024)
                    if not chunk:
                        break
                    digest.update(chunk)
                    byte_count += len(chunk)
                    spool.write(chunk)

                md5_hex = digest.hexdigest()
                md5_base64 = base64.b64encode(digest.digest()).decode("ascii")
                blob = bucket.blob(inventory_item.dest_key)

                if blob.exists():
                    blob.reload()
                    if int(blob.size) != byte_count or blob.md5_hash != md5_base64:
                        raise CommandError(
                            f"GCS collision for {inventory_item.dest_key}: checksum or size differs"
                        )
                    status_value = "verified_existing"
                else:
                    spool.seek(0)
                    blob.upload_from_file(spool, rewind=True)
                    blob.reload()
                    if int(blob.size) != byte_count or blob.md5_hash != md5_base64:
                        generation = int(blob.generation)
                        blob.delete(if_generation_match=generation)
                        raise CommandError(
                            f"GCS verification failed for {inventory_item.dest_key}"
                        )
                    status_value = "copied"

                self.append_manifest_row(
                    manifest_path,
                    {
                        "model": inventory_item.model,
                        "pk": inventory_item.pk,
                        "field": inventory_item.field,
                        "source_provider": inventory_item.source_provider,
                        "source_key": inventory_item.source_key,
                        "dest_key": inventory_item.dest_key,
                        "bytes": byte_count,
                        "md5": md5_hex,
                        "generation": int(blob.generation),
                        "status": status_value,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )

    def append_manifest_row(self, manifest_path, row):
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with manifest_path.open("a", encoding="utf-8") as manifest:
            manifest.write(json.dumps(row, sort_keys=True) + "\n")
            manifest.flush()
            os.fsync(manifest.fileno())

    def rollback_manifest(self, manifest_path):
        if not manifest_path.exists():
            raise CommandError(f"Manifest not found: {manifest_path}")

        bucket = self.get_bucket()
        with manifest_path.open("r", encoding="utf-8") as manifest:
            for line_number, line in enumerate(manifest, start=1):
                if not line.strip():
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise CommandError(
                        f"Invalid JSON on manifest line {line_number}"
                    ) from exc
                if row.get("status") != "copied":
                    continue
                key = row.get("dest_key")
                generation = row.get("generation")
                if not key or generation is None:
                    raise CommandError(
                        f"Manifest line {line_number} lacks destination generation"
                    )
                bucket.blob(key).delete(if_generation_match=int(generation))
