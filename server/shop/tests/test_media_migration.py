import base64
import hashlib
import io
import json
from datetime import datetime
from unittest.mock import patch

import pytest
from django.apps import apps
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import FileField

from shop.management.commands.migrate_media_to_gcs import (
    FIELD_MAP,
    Command,
    InventoryItem,
)
from shop.models import (
    ARExperience,
    Product,
    ProductMedia,
    Retailer,
    Review,
    ReviewMedia,
    ScentPersona,
    SiteAbout,
)


class FakeSourceStore:
    def __init__(self, objects):
        self.objects = objects
        self.opened = []
        self.deleted = []

    def open(self, key):
        self.opened.append(key)
        return io.BytesIO(self.objects[key])


class FakeBlob:
    def __init__(self, bucket, name):
        self.bucket = bucket
        self.name = name
        self.size = None
        self.md5_hash = None
        self.generation = None

    def exists(self):
        return self.name in self.bucket.objects

    def reload(self):
        record = self.bucket.objects[self.name]
        self.size = len(record["data"])
        self.md5_hash = base64.b64encode(hashlib.md5(record["data"]).digest()).decode("ascii")
        self.generation = record["generation"]

    def upload_from_file(self, stream, rewind=False):
        if rewind:
            stream.seek(0)
        self.bucket.uploads.append(self.name)
        self.bucket.next_generation += 1
        self.bucket.objects[self.name] = {
            "data": stream.read(),
            "generation": self.bucket.next_generation,
        }

    def delete(self, if_generation_match=None):
        record = self.bucket.objects[self.name]
        if if_generation_match != record["generation"]:
            raise AssertionError("generation guard missing or incorrect")
        self.bucket.deletes.append((self.name, if_generation_match))
        del self.bucket.objects[self.name]


class FakeBucket:
    def __init__(self, objects=None):
        self.objects = {}
        self.uploads = []
        self.deletes = []
        self.next_generation = 100
        for key, data in (objects or {}).items():
            self.next_generation += 1
            self.objects[key] = {"data": data, "generation": self.next_generation}

    def blob(self, key):
        return FakeBlob(self, key)


def item(provider="cloudinary", key="products/cards/card.jpg"):
    return InventoryItem(
        model="shop.Product",
        pk=7,
        field="card_image",
        source_provider=provider,
        source_key=key,
        dest_key=key,
    )


def configure_command(command, monkeypatch, inventory, sources, bucket):
    monkeypatch.setattr(command, "iter_inventory", lambda: iter(inventory))
    monkeypatch.setattr(command, "get_source_store", lambda provider: sources[provider])
    monkeypatch.setattr(command, "get_bucket", lambda: bucket)


def read_manifest(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def test_default_invocation_is_dry_run_and_writes_nothing(tmp_path):
    manifest = tmp_path / "dry-run.jsonl"
    with (
        patch.object(Command, "iter_inventory", return_value=iter([item()])),
        patch.object(Command, "get_source_store") as source_store,
        patch.object(Command, "get_bucket") as get_bucket,
    ):
        call_command("migrate_media_to_gcs", manifest=str(manifest))

    assert not manifest.exists()
    source_store.assert_not_called()
    get_bucket.assert_not_called()


@pytest.mark.django_db
def test_inventory_covers_every_non_empty_mapped_file_field(django_user_model):
    user = django_user_model.objects.create_user(
        username="inventory-user", avatar="avatars/user.jpg"
    )
    product = Product.objects.create(
        name="Inventory Product",
        category="TEST",
        price="1.00",
        stock=1,
        description="Inventory fixture",
        promo_image="products/promos/promo.jpg",
        card_image="products/cards/card.jpg",
    )
    product_media = ProductMedia.objects.create(
        product=product, file="products/media/demo.mp4", type="VIDEO"
    )
    ar = ARExperience.objects.create(
        product=product,
        marker_image="ar/markers/marker.jpg",
        marker_mind="ar/mind/target.mind",
        model_glb="ar/models/model.glb",
        app_download_file="ar/apk/app.apk",
    )
    persona = ScentPersona.objects.create(
        category="INVENTORY",
        persona_name="Inventory Persona",
        image="personas/persona.jpg",
        cover_image="personas/covers/cover.jpg",
    )
    review = Review.objects.create(user=user, product=product, rating=5)
    review_media = ReviewMedia.objects.create(
        review=review, file="reviews/media/review.webp", type="IMAGE"
    )
    about = SiteAbout.objects.create(hero_image="site/about/hero/hero.jpg")
    retailer = Retailer.objects.create(
        name="Inventory Retailer",
        address="Test address",
        image="retailers/images/store.jpg",
    )

    rows = list(Command().iter_inventory())
    actual = {(row.model, row.pk, row.field, row.source_provider, row.source_key) for row in rows}
    expected = {
        ("shop.User", user.pk, "avatar", "cloudinary", "avatars/user.jpg"),
        ("shop.Product", product.pk, "promo_image", "cloudinary", "products/promos/promo.jpg"),
        ("shop.Product", product.pk, "card_image", "cloudinary", "products/cards/card.jpg"),
        ("shop.ProductMedia", product_media.pk, "file", "cloudinary", "products/media/demo.mp4"),
        ("shop.ARExperience", ar.pk, "marker_image", "cloudinary", "ar/markers/marker.jpg"),
        ("shop.ARExperience", ar.pk, "marker_mind", "r2", "ar/mind/target.mind"),
        ("shop.ARExperience", ar.pk, "model_glb", "r2", "ar/models/model.glb"),
        ("shop.ARExperience", ar.pk, "app_download_file", "r2", "ar/apk/app.apk"),
        ("shop.ScentPersona", persona.pk, "image", "cloudinary", "personas/persona.jpg"),
        ("shop.ScentPersona", persona.pk, "cover_image", "cloudinary", "personas/covers/cover.jpg"),
        ("shop.ReviewMedia", review_media.pk, "file", "cloudinary", "reviews/media/review.webp"),
        ("shop.SiteAbout", about.pk, "hero_image", "cloudinary", "site/about/hero/hero.jpg"),
        ("shop.Retailer", retailer.pk, "image", "cloudinary", "retailers/images/store.jpg"),
    }
    assert actual == expected

    model_fields = {
        (model._meta.label, field.name)
        for model in apps.get_app_config("shop").get_models()
        for field in model._meta.fields
        if isinstance(field, FileField)
    }
    assert {(entry.model, entry.field) for entry in FIELD_MAP} == model_fields


def test_execute_spools_hashes_uploads_and_writes_verified_manifest(tmp_path, monkeypatch):
    payload = b"source-media-bytes"
    source = FakeSourceStore({"products/cards/card.jpg": payload})
    bucket = FakeBucket()
    manifest = tmp_path / "migration.jsonl"
    command = Command()
    configure_command(command, monkeypatch, [item()], {"cloudinary": source}, bucket)

    command.execute_migration(manifest)

    assert source.opened == ["products/cards/card.jpg"]
    assert bucket.objects["products/cards/card.jpg"]["data"] == payload
    assert bucket.uploads == ["products/cards/card.jpg"]
    rows = read_manifest(manifest)
    assert len(rows) == 1
    row = rows[0]
    assert set(row) == {
        "model", "pk", "field", "source_provider", "source_key", "dest_key",
        "bytes", "md5", "generation", "status", "timestamp",
    }
    assert row["dest_key"] == "products/cards/card.jpg"
    assert row["bytes"] == len(payload)
    assert row["md5"] == hashlib.md5(payload).hexdigest()
    assert row["generation"] == bucket.objects[row["dest_key"]]["generation"]
    assert row["status"] == "copied"
    datetime.fromisoformat(row["timestamp"])


def test_collision_with_different_checksum_stops_without_mutation(tmp_path, monkeypatch):
    key = "products/cards/card.jpg"
    source = FakeSourceStore({key: b"source"})
    bucket = FakeBucket({key: b"different destination"})
    original = dict(bucket.objects[key])
    manifest = tmp_path / "collision.jsonl"
    command = Command()
    configure_command(command, monkeypatch, [item(key=key)], {"cloudinary": source}, bucket)

    with pytest.raises(CommandError, match="collision"):
        command.execute_migration(manifest)

    assert bucket.objects[key] == original
    assert bucket.uploads == []
    assert bucket.deletes == []
    assert source.deleted == []
    assert not manifest.exists() or not manifest.read_text(encoding="utf-8")


def test_matching_rerun_is_verified_existing_and_does_not_upload(tmp_path, monkeypatch):
    key = "products/cards/card.jpg"
    payload = b"already copied"
    source = FakeSourceStore({key: payload})
    bucket = FakeBucket({key: payload})
    manifest = tmp_path / "rerun.jsonl"
    command = Command()
    configure_command(command, monkeypatch, [item(key=key)], {"cloudinary": source}, bucket)

    command.execute_migration(manifest)

    assert bucket.uploads == []
    assert read_manifest(manifest)[0]["status"] == "verified_existing"


def test_rollback_deletes_only_manifest_created_generations_and_never_sources(
    tmp_path, monkeypatch
):
    copied_key = "products/cards/copied.jpg"
    existing_key = "products/cards/existing.jpg"
    bucket = FakeBucket({copied_key: b"copied", existing_key: b"existing"})
    copied_generation = bucket.objects[copied_key]["generation"]
    existing_generation = bucket.objects[existing_key]["generation"]
    manifest = tmp_path / "rollback.jsonl"
    rows = [
        {"dest_key": copied_key, "generation": copied_generation, "status": "copied"},
        {"dest_key": existing_key, "generation": existing_generation, "status": "verified_existing"},
    ]
    manifest.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    command = Command()
    monkeypatch.setattr(command, "get_bucket", lambda: bucket)
    monkeypatch.setattr(
        command,
        "get_source_store",
        lambda _provider: pytest.fail("rollback must not initialize legacy stores"),
    )

    command.rollback_manifest(manifest)

    assert copied_key not in bucket.objects
    assert existing_key in bucket.objects
    assert bucket.deletes == [(copied_key, copied_generation)]
