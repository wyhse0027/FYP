import json
import os
from pathlib import Path
import subprocess
import sys

import pytest


SERVER_DIR = Path(__file__).resolve().parents[2]


def import_settings(*, module="backend.settings", process_env=None, dotenv_env=None):
    env = os.environ.copy()
    env.pop("DJANGO_DEBUG", None)
    env.pop("DJANGO_SECRET_KEY", None)
    env["SETTINGS_MODULE_UNDER_TEST"] = module
    env["SETTINGS_DOTENV_VALUES"] = json.dumps(dotenv_env or {})
    env.update(process_env or {})

    code = """
import importlib
import json
import os
from unittest.mock import patch

dotenv_values = json.loads(os.environ["SETTINGS_DOTENV_VALUES"])

def load_test_dotenv(path, *args, **kwargs):
    if str(path).replace("\\\\", "/").endswith("backend/.env"):
        for name, value in dotenv_values.items():
            os.environ.setdefault(name, value)
    return bool(dotenv_values)

with patch("dotenv.load_dotenv", side_effect=load_test_dotenv):
    settings = importlib.import_module(os.environ["SETTINGS_MODULE_UNDER_TEST"])

print(json.dumps({
    "debug": settings.DEBUG,
    "media_url": settings.MEDIA_URL,
    "media_root": str(settings.MEDIA_ROOT),
}))
"""
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=SERVER_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


def parsed_settings(result):
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_production_settings_accept_real_secret_and_define_media():
    result = import_settings(
        process_env={
            "DJANGO_DEBUG": "False",
            "DJANGO_SECRET_KEY": "a-real-secret-for-settings-contract-tests",
        }
    )

    settings = parsed_settings(result)
    assert settings["debug"] is False
    assert settings["media_url"] == "/media/"
    assert settings["media_root"].endswith("media")


@pytest.mark.parametrize("secret", [None, "dev-only"])
def test_production_settings_reject_missing_or_development_secret(secret):
    process_env = {"DJANGO_DEBUG": "False"}
    if secret is not None:
        process_env["DJANGO_SECRET_KEY"] = secret

    result = import_settings(process_env=process_env)

    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr


def test_project_dotenv_is_loaded_before_debug_is_evaluated():
    result = import_settings(
        dotenv_env={
            "DJANGO_DEBUG": "True",
            "DJANGO_SECRET_KEY": "dev-only",
        }
    )

    assert parsed_settings(result)["debug"] is True


def test_test_settings_import_with_its_own_safe_values():
    result = import_settings(module="backend.settings_test")

    assert parsed_settings(result)["debug"] is True
