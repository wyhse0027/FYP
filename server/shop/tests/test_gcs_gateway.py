from dataclasses import FrozenInstanceError
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from google.auth import credentials as google_credentials

from shop.gcs import GCSGateway, StoredObject


class _LocalSigner(google_credentials.Credentials, google_credentials.Signing):
    """Stand-in for a JSON-key service account that can sign locally."""

    def refresh(self, request):  # pragma: no cover - not exercised
        pass

    def sign_bytes(self, message):  # pragma: no cover - not exercised
        return b"sig"

    @property
    def signer_email(self):
        return "local@example.iam.gserviceaccount.com"

    @property
    def signer(self):
        return object()


@patch("google.cloud.storage.Client")
def test_create_signed_put_with_local_key_signs_directly(client_class):
    client = client_class.return_value
    client._credentials = _LocalSigner()
    blob = client.bucket.return_value.blob.return_value
    blob.generate_signed_url.return_value = "https://signed.example/upload"

    result = GCSGateway().create_signed_put(
        "ar/models/random_model.glb",
        1234,
        "model/gltf-binary",
    )

    assert result == "https://signed.example/upload"
    blob.generate_signed_url.assert_called_once_with(
        version="v4",
        expiration=timedelta(minutes=15),
        method="PUT",
        content_type="model/gltf-binary",
        headers={"Content-Length": "1234"},
    )


@patch("google.cloud.storage.Client")
def test_create_signed_put_keyless_signs_via_iam(client_class):
    """On Cloud Run the attached SA has no private key → sign via IAM signBlob."""
    refreshed = []
    client = client_class.return_value
    client._credentials = SimpleNamespace(
        service_account_email="run-sa@eleganza-ar.iam.gserviceaccount.com",
        token="ya29.fake-access-token",
        refresh=lambda request: refreshed.append(request),
    )
    blob = client.bucket.return_value.blob.return_value
    blob.generate_signed_url.return_value = "https://signed.example/upload"

    GCSGateway().create_signed_put("ar/models/random_model.glb", 1234, "model/gltf-binary")

    assert refreshed, "credentials must be refreshed to obtain a token"
    blob.generate_signed_url.assert_called_once_with(
        version="v4",
        expiration=timedelta(minutes=15),
        method="PUT",
        content_type="model/gltf-binary",
        headers={"Content-Length": "1234"},
        service_account_email="run-sa@eleganza-ar.iam.gserviceaccount.com",
        access_token="ya29.fake-access-token",
    )


@patch("google.cloud.storage.Client")
def test_stat_returns_immutable_stored_object(client_class):
    client = client_class.return_value
    blob = client.bucket.return_value.blob.return_value
    blob.exists.return_value = True
    blob.name = "ar/models/random_model.glb"
    blob.size = "1234"
    blob.content_type = "model/gltf-binary"
    blob.generation = "42"

    result = GCSGateway().stat("ar/models/random_model.glb")

    assert result == StoredObject(
        name="ar/models/random_model.glb",
        size=1234,
        content_type="model/gltf-binary",
        generation=42,
    )
    blob.exists.assert_called_once_with(client=client)
    blob.reload.assert_called_once_with(client=client)
    with pytest.raises(FrozenInstanceError):
        result.size = 5678
