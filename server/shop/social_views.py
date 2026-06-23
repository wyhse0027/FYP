# shop/social_views.py
import hashlib
import os
import re
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

User = get_user_model()


def _base_username_from_email(email):
    local_part = email.split("@", 1)[0]
    username = re.sub(r"[^a-zA-Z0-9_-]+", "-", local_part).strip("-_").lower()
    return username or "google-user"


def _unique_username_for_email(email):
    base = _base_username_from_email(email)[:120]
    if not User.objects.filter(username=base).exists():
        return base

    digest = hashlib.sha256(email.encode("utf-8")).hexdigest()[:8]
    candidate = f"{base}-{digest}"[:150]
    if not User.objects.filter(username=candidate).exists():
        return candidate

    for counter in range(1, 100):
        suffix = f"-{digest}-{counter}"
        candidate = f"{base[:150 - len(suffix)]}{suffix}"
        if not User.objects.filter(username=candidate).exists():
            return candidate

    return f"google-user-{digest}"


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("id_token")  # ✅ changed
        if not token:
            return Response({"detail": "id_token missing."}, status=400)

        try:
            # ✅ verify token + audience
            idinfo = id_token.verify_oauth2_token(
                token,
                grequests.Request(),
                audience=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
            )
            email = (idinfo.get("email") or "").strip().lower()
            email_verified = idinfo.get("email_verified") is True
            name = idinfo.get("name", "Google User")
        except Exception:
            return Response({"detail": "Invalid Google token."}, status=400)

        if not email:
            return Response({"detail": "Google email missing."}, status=400)

        if not email_verified:
            return Response({"detail": "Google email is not verified."}, status=400)

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).order_by("id").first()
            created = user is None
            if created:
                try:
                    user = User.objects.create(
                        email=email,
                        username=_unique_username_for_email(email),
                        first_name=name,
                    )
                except IntegrityError:
                    user = User.objects.filter(email__iexact=email).order_by("id").first()
                    if user is None:
                        user = User.objects.create(
                            email=email,
                            username=_unique_username_for_email(email),
                            first_name=name,
                        )
            elif user.email != email:
                user.email = email
                user.save(update_fields=["email"])

        if created:
            user.set_unusable_password()
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_staff": user.is_staff,
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })
