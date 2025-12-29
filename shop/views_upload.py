# shop/views_upload.py
import os
import uuid
import boto3

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import ARExperience


ALLOWED = {
    "glb": {
        "folder": "ar/models",
        "exts": {".glb"},
        "content_types": {"model/gltf-binary", "application/octet-stream"},
    },
    "apk": {
        "folder": "ar/apk",
        "exts": {".apk"},
        "content_types": {
            "application/vnd.android.package-archive",
            "application/octet-stream",
        },
    },
}


class R2PresignBigFile(APIView):
    """
    Generate a presigned PUT URL for uploading big files directly to Cloudflare R2.
    Frontend will:
      1) POST here to get upload_url + key
      2) PUT file to upload_url
      3) PATCH /ar/<id>/finalize-bigfile/ with kind + key to save into DB
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        kind = request.data.get("kind")
        filename = request.data.get("filename") or ""
        content_type = request.data.get("content_type") or "application/octet-stream"

        if kind not in ALLOWED:
            return Response({"detail": "Invalid kind"}, status=status.HTTP_400_BAD_REQUEST)

        safe_name = os.path.basename(filename).strip().replace(" ", "_")
        if not safe_name:
            return Response({"detail": "filename required"}, status=status.HTTP_400_BAD_REQUEST)

        _, ext = os.path.splitext(safe_name.lower())
        if ext not in ALLOWED[kind]["exts"]:
            return Response(
                {"detail": f"Invalid file type {ext}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If browser sends weird types, fallback to octet-stream
        if content_type not in ALLOWED[kind]["content_types"]:
            content_type = "application/octet-stream"

        folder = ALLOWED[kind]["folder"]
        key = f"{folder}/{uuid.uuid4()}_{safe_name}"

        # Build R2 S3-compatible client from Django settings
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name="auto",
        )

        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=900,  # 15 minutes
        )

        if not getattr(settings, "R2_PUBLIC_BASE_URL", ""):
            return Response(
                {"detail": "R2_PUBLIC_BASE_URL not set"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        public_url = f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"

        return Response(
            {"upload_url": upload_url, "public_url": public_url, "key": key},
            status=status.HTTP_200_OK,
        )


class ARFinalizeBigFile(APIView):
    """
    After frontend uploads to R2, call this to save the object key into the
    existing FileField in ARExperience WITHOUT uploading through Django.

    Request body:
      {
        "kind": "glb" | "apk",
        "key": "ar/models/<uuid>_file.glb" OR "ar/apk/<uuid>_file.apk"
      }
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        kind = request.data.get("kind")
        key = request.data.get("key")

        if kind not in ("glb", "apk") or not key:
            return Response(
                {"detail": "kind + key required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # basic safety checks: prevent writing random paths
        key = key.strip()
        if ".." in key or key.startswith("/") or key.startswith("http"):
            return Response(
                {"detail": "Invalid key"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure key matches folder
        if kind == "glb" and not key.startswith("ar/models/"):
            return Response({"detail": "Key must start with ar/models/"},
                            status=status.HTTP_400_BAD_REQUEST)
        if kind == "apk" and not key.startswith("ar/apk/"):
            return Response({"detail": "Key must start with ar/apk/"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            ar = ARExperience.objects.get(pk=pk)
        except ARExperience.DoesNotExist:
            return Response(
                {"detail": "ARExperience not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Save key into FileField name (no upload)
        if kind == "glb":
            ar.model_glb.name = key
            ar.save(update_fields=["model_glb", "updated_at"])
        else:
            ar.app_download_file.name = key
            ar.save(update_fields=["app_download_file", "updated_at"])

        return Response({"detail": "ok"}, status=status.HTTP_200_OK)
