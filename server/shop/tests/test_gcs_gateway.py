from dataclasses import FrozenInstanceError
from datetime import timedelta
from unittest.mock import patch

import pytest

from shop.gcs import GCSGateway, StoredObject


@patch("google.cloud.storage.Client")
def test_create_signed_put_uses_exact_v4_contract(client_class):
    client = client_class.return_value
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
