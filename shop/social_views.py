# shop/social_views.py
import requests
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

User = get_user_model()

class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("access_token")
        if not token:
            return Response({"detail": "Access token missing."}, status=400)

        try:
            idinfo = id_token.verify_oauth2_token(token, grequests.Request())
            email = idinfo.get("email")
            name = idinfo.get("name", "Google User")
        except Exception as e:
            return Response({"detail": f"Invalid Google token: {e}"}, status=400)

        if not email:
            return Response({"detail": "Google email missing."}, status=400)

        user, _ = User.objects.get_or_create(
            email=email,
            defaults={"username": email.split("@")[0], "first_name": name},
        )

        refresh = RefreshToken.for_user(user)
        return Response({
            "user": {"id": user.id, "username": user.username, "email": user.email},
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })
