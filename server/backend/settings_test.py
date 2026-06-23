import os

# Test settings opt into development mode before importing the fail-closed base
# settings, preserving the pre-existing no-HTTPS-redirect test behavior.
os.environ["DJANGO_DEBUG"] = "True"
os.environ["DJANGO_SECRET_KEY"] = "test-only-secret-key"

from .settings import *  # noqa: F403,F401

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
