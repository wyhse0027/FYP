"""Phase 4 Task 1 — production settings contract.

Imports backend.settings in a child process with a controlled environment (the
project .env is patched out) so DEBUG=False branches are exercised exactly as they
will be on Cloud Run, and asserts the deploy-relevant settings.
"""
import json
import os
from pathlib import Path
import subprocess
import sys


SERVER_DIR = Path(__file__).resolve().parents[2]

PROD_ENV = {
    "DJANGO_DEBUG": "False",
    "DJANGO_SECRET_KEY": "a-real-secret-for-prod-settings-tests",
}


def import_prod_settings(process_env):
    env = os.environ.copy()
    for key in ("DJANGO_DEBUG", "DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS",
                "CSRF_TRUSTED_ORIGINS", "CORS_ALLOWED_ORIGINS", "DATABASE_URL",
                "SECURE_HSTS_SECONDS"):
        env.pop(key, None)
    env.update(process_env)

    code = """
import importlib, json, os
from unittest.mock import patch

# Patch out the project .env so only the process environment governs settings.
with patch("dotenv.load_dotenv", return_value=False):
    settings = importlib.import_module("backend.settings")

db = settings.DATABASES["default"]
print(json.dumps({
    "debug": settings.DEBUG,
    "allowed_hosts": settings.ALLOWED_HOSTS,
    "csrf_trusted_origins": settings.CSRF_TRUSTED_ORIGINS,
    "cors_allow_all_origins": settings.CORS_ALLOW_ALL_ORIGINS,
    "cors_allowed_origins": settings.CORS_ALLOWED_ORIGINS,
    "secure_ssl_redirect": getattr(settings, "SECURE_SSL_REDIRECT", False),
    "session_cookie_secure": getattr(settings, "SESSION_COOKIE_SECURE", False),
    "csrf_cookie_secure": getattr(settings, "CSRF_COOKIE_SECURE", False),
    "secure_proxy_ssl_header": list(getattr(settings, "SECURE_PROXY_SSL_HEADER", []) or []),
    "secure_hsts_seconds": getattr(settings, "SECURE_HSTS_SECONDS", 0),
    "secure_hsts_include_subdomains": getattr(settings, "SECURE_HSTS_INCLUDE_SUBDOMAINS", False),
    "db_engine": db.get("ENGINE"),
    "db_options": db.get("OPTIONS", {}),
}))
"""
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=SERVER_DIR, env=env, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_prod_security_flags_enabled():
    s = import_prod_settings(PROD_ENV)
    assert s["debug"] is False
    assert s["secure_ssl_redirect"] is True
    assert s["session_cookie_secure"] is True
    assert s["csrf_cookie_secure"] is True
    assert s["secure_proxy_ssl_header"] == ["HTTP_X_FORWARDED_PROTO", "https"]
    # Prod must never reflect requests with allow-all CORS.
    assert s["cors_allow_all_origins"] is False
    # HSTS is opt-in: default off so it is never set carelessly on the demo domain.
    assert s["secure_hsts_seconds"] == 0
    assert s["secure_hsts_include_subdomains"] is False


def test_hsts_opt_in_via_env():
    s = import_prod_settings({**PROD_ENV, "SECURE_HSTS_SECONDS": "3600"})
    assert s["secure_hsts_seconds"] == 3600
    assert s["secure_hsts_include_subdomains"] is True


def test_prod_hosts_and_origins_come_from_env():
    s = import_prod_settings({
        **PROD_ENV,
        "DJANGO_ALLOWED_HOSTS": "eleganza-api.asia-southeast1.run.app,localhost",
        "CSRF_TRUSTED_ORIGINS": "https://eleganza-ar.web.app",
        "CORS_ALLOWED_ORIGINS": "https://eleganza-ar.web.app",
    })
    assert s["allowed_hosts"] == ["eleganza-api.asia-southeast1.run.app", "localhost"]
    assert s["csrf_trusted_origins"] == ["https://eleganza-ar.web.app"]
    assert s["cors_allowed_origins"] == ["https://eleganza-ar.web.app"]


def test_cloud_sql_unix_socket_url_disables_ssl():
    s = import_prod_settings({
        **PROD_ENV,
        "DATABASE_URL": "postgresql://u:p@/appdb?host=/cloudsql/eleganza-ar:asia-southeast1:elz-pg",
    })
    assert s["db_engine"] == "django.db.backends.postgresql"
    assert s["db_options"].get("host") == "/cloudsql/eleganza-ar:asia-southeast1:elz-pg"
    # TLS over a Unix socket is invalid — sslmode must NOT be requested.
    assert "sslmode" not in s["db_options"]


def test_network_postgres_url_requires_ssl():
    s = import_prod_settings({
        **PROD_ENV,
        "DATABASE_URL": "postgresql://u:p@db.neon.tech:5432/appdb",
    })
    assert s["db_engine"] == "django.db.backends.postgresql"
    assert s["db_options"].get("sslmode") == "require"
