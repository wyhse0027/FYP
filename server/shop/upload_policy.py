from dataclasses import dataclass
from pathlib import Path

from django.core import signing
from rest_framework.exceptions import ValidationError


UPLOAD_CLAIM_SALT = "shop.gcs-upload"
UPLOAD_CLAIM_MAX_AGE = 900


@dataclass(frozen=True)
class UploadSpec:
    folder: str
    extensions: frozenset[str]
    content_types: frozenset[str]
    max_size: int
    model_field: str


UPLOAD_SPECS = {
    "glb": UploadSpec(
        "ar/models",
        frozenset({".glb"}),
        frozenset({"model/gltf-binary", "application/octet-stream"}),
        50 * 1024 * 1024,
        "model_glb",
    ),
    "apk": UploadSpec(
        "ar/apk",
        frozenset({".apk"}),
        frozenset(
            {
                "application/vnd.android.package-archive",
                "application/octet-stream",
            }
        ),
        500 * 1024 * 1024,
        "app_download_file",
    ),
}


def validate_upload(kind: str, filename: str, content_type: str, size: int) -> UploadSpec:
    spec = UPLOAD_SPECS.get(kind)
    if spec is None:
        raise ValidationError("Unknown upload kind.")
    if size <= 0 or size > spec.max_size:
        raise ValidationError("Invalid upload size.")
    if not filename or filename in {".", ".."} or "/" in filename or "\\" in filename:
        raise ValidationError("Filename must be a basename.")
    if Path(filename).suffix.lower() not in spec.extensions:
        raise ValidationError("File extension is not allowed for this upload kind.")
    if content_type not in spec.content_types:
        raise ValidationError("Content type is not allowed for this upload kind.")
    return spec


def build_upload_claim(
    user_id: int,
    kind: str,
    key: str,
    size: int,
    content_type: str,
) -> str:
    return signing.dumps(
        {
            "user_id": user_id,
            "kind": kind,
            "key": key,
            "size": size,
            "content_type": content_type,
        },
        salt=UPLOAD_CLAIM_SALT,
    )


def load_upload_claim(token: str) -> dict:
    return signing.loads(
        token,
        salt=UPLOAD_CLAIM_SALT,
        max_age=UPLOAD_CLAIM_MAX_AGE,
    )
