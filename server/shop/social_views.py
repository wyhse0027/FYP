# shop/social_views.py
import os
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

User = get_user_model()

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
            email = idinfo.get("email")
            name = idinfo.get("name", "Google User")
        except Exception as e:
            return Response({"detail": f"Invalid Google token: {e}"}, status=400)

        if not email:
            return Response({"detail": "Google email missing."}, status=400)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"username": email.split("@")[0], "first_name": name},
        )

        if created:
            user.set_unusable_password()
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            "user": {"id": user.id, "username": user.username, "email": user.email},
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })
