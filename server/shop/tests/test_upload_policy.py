import pytest
from django.core import signing
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
    token = build_upload_claim(
        7,
        "glb",
        "ar/models/random_model.glb",
        1234,
        "model/gltf-binary",
    )

    claim = load_upload_claim(token)

    assert claim == {
        "user_id": 7,
        "kind": "glb",
        "key": "ar/models/random_model.glb",
        "size": 1234,
        "content_type": "model/gltf-binary",
    }


def test_policy_rejects_unknown_kind():
    with pytest.raises(ValidationError):
        validate_upload("zip", "archive.zip", "application/zip", 1234)


@pytest.mark.parametrize("filename", ["../model.glb", "folder/model.glb", r"folder\model.glb"])
def test_policy_rejects_path_components(filename):
    with pytest.raises(ValidationError):
        validate_upload("glb", filename, "model/gltf-binary", 1234)


@pytest.mark.parametrize(
    ("filename", "content_type"),
    [
        ("model.apk", "model/gltf-binary"),
        ("model.glb", "application/gltf+json"),
    ],
)
def test_glb_policy_rejects_extension_or_mime_mismatch(filename, content_type):
    with pytest.raises(ValidationError):
        validate_upload("glb", filename, content_type, 1234)


def test_apk_policy_accepts_500_mib_boundary():
    result = validate_upload(
        "apk",
        "eleganza.apk",
        "application/vnd.android.package-archive",
        500 * 1024 * 1024,
    )
    assert result.folder == "ar/apk"


def test_claim_expires_after_15_minutes(monkeypatch):
    monkeypatch.setattr("django.core.signing.time.time", lambda: 1_000)
    token = build_upload_claim(
        7,
        "glb",
        "ar/models/random_model.glb",
        1234,
        "model/gltf-binary",
    )
    monkeypatch.setattr("django.core.signing.time.time", lambda: 1_901)

    with pytest.raises(signing.SignatureExpired):
        load_upload_claim(token)


def test_claim_rejects_tampering():
    token = build_upload_claim(
        7,
        "glb",
        "ar/models/random_model.glb",
        1234,
        "model/gltf-binary",
    )
    replacement = "A" if token[-1] != "A" else "B"

    with pytest.raises(signing.BadSignature):
        load_upload_claim(token[:-1] + replacement)
