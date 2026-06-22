from django.conf import settings


def test_suite_uses_isolated_sqlite_and_memory_storage():
    assert settings.DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3"
    assert settings.STORAGES["default"]["BACKEND"].endswith("InMemoryStorage")
