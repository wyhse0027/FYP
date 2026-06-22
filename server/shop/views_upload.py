import uuid

from django.core import signing
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .gcs import GCSGateway
from .models import ARExperience
from .upload_policy import (
    UPLOAD_SPECS,
    build_upload_claim,
    load_upload_claim,
    validate_upload,
)


def _invalid(detail):
    return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)


def _key_in_folder(key, folder):
    prefix = f"{folder}/"
    return (
        key.startswith(prefix)
        and key != prefix
        and "\\" not in key
        and ".." not in key.split("/")
    )


class PresignBigFile(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        kind = request.data.get("kind")
        filename = request.data.get("filename")
        content_type = request.data.get("content_type")
        size = request.data.get("size")

        if not all(isinstance(value, str) for value in (kind, filename, content_type)):
            return _invalid("kind, filename, and content_type are required")
        if not isinstance(size, int) or isinstance(size, bool):
            return _invalid("size must be an integer")

        try:
            spec = validate_upload(kind, filename, content_type, size)
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        key = f"{spec.folder}/{uuid.uuid4()}_{filename}"
        gateway = GCSGateway()
        upload_token = build_upload_claim(
            request.user.pk,
            kind,
            key,
            size,
            content_type,
        )

        return Response(
            {
                "upload_url": gateway.create_signed_put(key, size, content_type),
                "public_url": gateway.public_url(key),
                "key": key,
                "upload_token": upload_token,
            },
            status=status.HTTP_200_OK,
        )


class ARFinalizeBigFile(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        kind = request.data.get("kind")
        key = request.data.get("key")
        upload_token = request.data.get("upload_token")
        if not all(isinstance(value, str) and value for value in (kind, key, upload_token)):
            return _invalid("kind, key, and upload_token are required")

        try:
            claim = load_upload_claim(upload_token)
        except (signing.BadSignature, signing.SignatureExpired):
            return _invalid("Invalid or expired upload token")

        spec = UPLOAD_SPECS.get(kind)
        if spec is None or not isinstance(claim, dict):
            return _invalid("Invalid upload claim")
        if (
            claim.get("user_id") != request.user.pk
            or claim.get("kind") != kind
            or claim.get("key") != key
            or not _key_in_folder(key, spec.folder)
        ):
            return _invalid("Upload claim does not match request")

        size = claim.get("size")
        content_type = claim.get("content_type")
        filename = key.rsplit("/", 1)[-1]
        if not isinstance(size, int) or not isinstance(content_type, str):
            return _invalid("Invalid upload claim facts")
        try:
            validate_upload(kind, filename, content_type, size)
        except ValidationError:
            return _invalid("Invalid upload claim facts")

        try:
            ar = ARExperience.objects.get(pk=pk)
        except ARExperience.DoesNotExist:
            return Response(
                {"detail": "ARExperience not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        field = getattr(ar, spec.model_field)
        if (getattr(field, "name", "") or "") == key:
            return Response({"detail": "ok"}, status=status.HTTP_200_OK)

        gateway = GCSGateway()
        stored = gateway.stat(key)
        if stored is None:
            return _invalid("Uploaded object not found")
        if (
            stored.name != key
            or stored.size != size
            or stored.content_type != content_type
        ):
            gateway.delete(key, generation=stored.generation)
            return _invalid("Uploaded object does not match signed claim")

        setattr(ar, spec.model_field, key)
        ar.save(update_fields=[spec.model_field, "updated_at"])
        return Response({"detail": "ok"}, status=status.HTTP_200_OK)


class ARDeleteBigFile(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        kind = (request.query_params.get("kind") or "").strip().lower()
        spec = UPLOAD_SPECS.get(kind)
        if spec is None:
            return _invalid("kind must be glb or apk")

        try:
            ar = ARExperience.objects.get(pk=pk)
        except ARExperience.DoesNotExist:
            return Response(
                {"detail": "ARExperience not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        field = getattr(ar, spec.model_field)
        key = (getattr(field, "name", "") or "").strip()
        if not key:
            return Response({"detail": "already empty"}, status=status.HTTP_200_OK)
        if not _key_in_folder(key, spec.folder):
            return _invalid(f"Invalid stored key for {kind}")

        gateway = GCSGateway()
        stored = gateway.stat(key)
        if stored is None:
            return _invalid("Stored object not found")
        gateway.delete(key, generation=stored.generation)

        setattr(ar, spec.model_field, None)
        ar.save(update_fields=[spec.model_field, "updated_at"])
        return Response({"detail": "deleted"}, status=status.HTTP_200_OK)
