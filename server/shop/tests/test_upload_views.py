from unittest.mock import patch
from uuid import UUID

import pytest
from django.core import signing
from rest_framework.test import APIClient

from shop.gcs import StoredObject
from shop.models import ARExperience, Product
from shop.upload_policy import build_upload_claim


@pytest.fixture
def users(django_user_model):
    user = django_user_model.objects.create_user(
        username="ordinary-user",
        password="password",
        role="user",
        is_staff=False,
    )
    admin = django_user_model.objects.create_user(
        username="staff-admin",
        password="password",
        role="admin",
        is_staff=True,
    )
    other_admin = django_user_model.objects.create_user(
        username="other-admin",
        password="password",
        role="admin",
        is_staff=True,
    )
    return user, admin, other_admin


@pytest.fixture
def ar_experience():
    product = Product.objects.create(
        name="Task 4 Product",
        category="TEST",
        price="1.00",
        stock=1,
        description="Upload verification fixture",
    )
    return ARExperience.objects.create(product=product)


def authenticate(client, user):
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("method", "url", "payload", "admin_status"),
    [
        ("post", "/api/uploads/presign/", {}, 400),
        ("patch", "/api/ar/999999/finalize-bigfile/", {}, 400),
        ("delete", "/api/ar/999999/delete-bigfile/", {}, 400),
    ],
)
def test_upload_views_are_admin_only(method, url, payload, admin_status, users):
    user, admin, _other_admin = users
    client = APIClient()

    assert getattr(client, method)(url, payload, format="json").status_code == 401

    authenticate(client, user)
    assert getattr(client, method)(url, payload, format="json").status_code == 403

    authenticate(client, admin)
    assert getattr(client, method)(url, payload, format="json").status_code == admin_status


@pytest.mark.django_db
@patch("shop.views_upload.GCSGateway")
def test_presign_returns_exact_contract_with_random_uuid(gateway_class, users):
    _user, admin, _other_admin = users
    gateway = gateway_class.return_value
    gateway.create_signed_put.return_value = "https://signed.example/upload"
    gateway.public_url.return_value = "https://storage.example/public"
    client = authenticate(APIClient(), admin)

    response = client.post(
        "/api/uploads/presign/",
        {
            "kind": "glb",
            "filename": "model.glb",
            "content_type": "model/gltf-binary",
            "size": 1234,
        },
        format="json",
    )

    assert response.status_code == 200
    assert set(response.data) == {"upload_url", "public_url", "key", "upload_token"}
    assert response.data["upload_url"] == "https://signed.example/upload"
    assert response.data["public_url"] == "https://storage.example/public"
    prefix, object_name = response.data["key"].rsplit("/", 1)
    object_uuid, filename = object_name.split("_", 1)
    assert prefix == "ar/models"
    assert filename == "model.glb"
    UUID(object_uuid)
    gateway.create_signed_put.assert_called_once_with(
        response.data["key"], 1234, "model/gltf-binary"
    )
    gateway.public_url.assert_called_once_with(response.data["key"])


@pytest.mark.django_db
@pytest.mark.parametrize(
    "payload",
    [
        {"kind": "glb", "filename": "model.glb", "content_type": "model/gltf-binary", "size": 0},
        {"kind": "glb", "filename": "model.glb", "content_type": "text/plain", "size": 1234},
        {"kind": "glb", "filename": "../model.glb", "content_type": "model/gltf-binary", "size": 1234},
        {"kind": "glb", "filename": "model.apk", "content_type": "model/gltf-binary", "size": 1234},
    ],
)
@patch("shop.views_upload.GCSGateway")
def test_presign_rejects_invalid_facts_without_gateway(gateway_class, payload, users):
    _user, admin, _other_admin = users
    client = authenticate(APIClient(), admin)

    response = client.post("/api/uploads/presign/", payload, format="json")

    assert response.status_code == 400
    gateway_class.assert_not_called()


def claim_for(admin, key="ar/models/candidate.glb", size=1234, content_type="model/gltf-binary"):
    return build_upload_claim(admin.pk, "glb", key, size, content_type)


@pytest.mark.django_db
@pytest.mark.parametrize("token", [None, "tampered-token"])
@patch("shop.views_upload.GCSGateway")
def test_finalize_rejects_missing_or_tampered_token(gateway_class, token, users, ar_experience):
    _user, admin, _other_admin = users
    client = authenticate(APIClient(), admin)
    payload = {"kind": "glb", "key": "ar/models/candidate.glb"}
    if token is not None:
        payload["upload_token"] = token

    response = client.patch(
        f"/api/ar/{ar_experience.pk}/finalize-bigfile/", payload, format="json"
    )

    assert response.status_code == 400
    gateway_class.assert_not_called()


@pytest.mark.django_db
@patch("shop.views_upload.GCSGateway")
def test_finalize_rejects_expired_token(gateway_class, monkeypatch, users, ar_experience):
    _user, admin, _other_admin = users
    monkeypatch.setattr("django.core.signing.time.time", lambda: 1_000)
    token = claim_for(admin)
    monkeypatch.setattr("django.core.signing.time.time", lambda: 1_901)
    client = authenticate(APIClient(), admin)

    response = client.patch(
        f"/api/ar/{ar_experience.pk}/finalize-bigfile/",
        {"kind": "glb", "key": "ar/models/candidate.glb", "upload_token": token},
        format="json",
    )

    assert response.status_code == 400
    gateway_class.assert_not_called()


@pytest.mark.django_db
@patch("shop.views_upload.GCSGateway")
def test_finalize_rejects_claim_from_another_admin(gateway_class, users, ar_experience):
    _user, admin, other_admin = users
    client = authenticate(APIClient(), admin)

    response = client.patch(
        f"/api/ar/{ar_experience.pk}/finalize-bigfile/",
        {
            "kind": "glb",
            "key": "ar/models/candidate.glb",
            "upload_token": claim_for(other_admin),
        },
        format="json",
    )

    assert response.status_code == 400
    gateway_class.assert_not_called()


@pytest.mark.django_db
@patch("shop.views_upload.GCSGateway")
def test_finalize_rejects_missing_object_without_db_change(gateway_class, users, ar_experience):
    _user, admin, _other_admin = users
    gateway_class.return_value.stat.return_value = None
    client = authenticate(APIClient(), admin)

    response = client.patch(
        f"/api/ar/{ar_experience.pk}/finalize-bigfile/",
        {
            "kind": "glb",
            "key": "ar/models/candidate.glb",
            "upload_token": claim_for(admin),
        },
        format="json",
    )

    assert response.status_code == 400
    ar_experience.refresh_from_db()
    assert not ar_experience.model_glb


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("actual_size", "actual_type"),
    [(1235, "model/gltf-binary"), (1234, "application/octet-stream")],
)
@patch("shop.views_upload.GCSGateway")
def test_finalize_deletes_generation_on_object_mismatch(
    gateway_class, actual_size, actual_type, users, ar_experience
):
    _user, admin, _other_admin = users
    gateway = gateway_class.return_value
    gateway.stat.return_value = StoredObject(
        "ar/models/candidate.glb", actual_size, actual_type, 42
    )
    client = authenticate(APIClient(), admin)

    response = client.patch(
        f"/api/ar/{ar_experience.pk}/finalize-bigfile/",
        {
            "kind": "glb",
            "key": "ar/models/candidate.glb",
            "upload_token": claim_for(admin),
        },
        format="json",
    )

    assert response.status_code == 400
    gateway.delete.assert_called_once_with("ar/models/candidate.glb", generation=42)
    ar_experience.refresh_from_db()
    assert not ar_experience.model_glb


@pytest.mark.django_db
@patch("shop.views_upload.GCSGateway")
def test_finalize_sets_field_and_repeated_request_is_idempotent(
    gateway_class, users, ar_experience
):
    _user, admin, _other_admin = users
    gateway = gateway_class.return_value
    gateway.stat.return_value = StoredObject(
        "ar/models/candidate.glb", 1234, "model/gltf-binary", 42
    )
    client = authenticate(APIClient(), admin)
    payload = {
        "kind": "glb",
        "key": "ar/models/candidate.glb",
        "upload_token": claim_for(admin),
    }
    url = f"/api/ar/{ar_experience.pk}/finalize-bigfile/"

    first = client.patch(url, payload, format="json")
    second = client.patch(url, payload, format="json")

    assert first.status_code == 200
    assert second.status_code == 200
    ar_experience.refresh_from_db()
    assert ar_experience.model_glb.name == "ar/models/candidate.glb"
    gateway.stat.assert_called_once_with("ar/models/candidate.glb")


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("claim_key", "request_key"),
    [
        ("ar/models/candidate.glb", "ar/models/different.glb"),
        ("outside/candidate.glb", "outside/candidate.glb"),
    ],
)
@patch("shop.views_upload.GCSGateway")
def test_finalize_rejects_key_outside_claim_or_prefix(
    gateway_class, claim_key, request_key, users, ar_experience
):
    _user, admin, _other_admin = users
    client = authenticate(APIClient(), admin)
    token = build_upload_claim(
        admin.pk, "glb", claim_key, 1234, "model/gltf-binary"
    )

    response = client.patch(
        f"/api/ar/{ar_experience.pk}/finalize-bigfile/",
        {"kind": "glb", "key": request_key, "upload_token": token},
        format="json",
    )

    assert response.status_code == 400
    gateway_class.assert_not_called()
