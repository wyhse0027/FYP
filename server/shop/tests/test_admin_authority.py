import importlib

import pytest
from rest_framework.test import APIClient

from shop.models import UserRole
from shop.serializers import UserSerializer


@pytest.mark.django_db
def test_role_write_cannot_promote_user_without_is_staff(django_user_model):
    user = django_user_model.objects.create_user(
        username="role-only-admin",
        password="password",
        role=UserRole.ADMIN,
        is_staff=False,
    )

    user.refresh_from_db()
    assert user.is_staff is False
    assert user.role == UserRole.USER


@pytest.mark.django_db
def test_role_only_admin_shape_cannot_access_admin_api(django_user_model):
    user = django_user_model.objects.create_user(
        username="role-only-denied",
        password="password",
        role=UserRole.ADMIN,
        is_staff=False,
    )

    client = APIClient()
    client.force_authenticate(user)
    response = client.get("/api/admin/dashboard-stats/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_user_serializer_exposes_authoritative_is_staff_read_only(django_user_model):
    user = django_user_model.objects.create_user(
        username="staff-serializer",
        password="password",
        is_staff=True,
    )

    serializer = UserSerializer(user)

    assert serializer.data["is_staff"] is True
    assert serializer.data["role"] == UserRole.ADMIN
    assert "is_staff" in UserSerializer.Meta.read_only_fields


def test_admin_role_backfill_migration_promotes_existing_role_admin_users():
    migration = importlib.import_module(
        "shop.migrations.0033_backfill_admin_role_to_is_staff"
    )

    class UserManager:
        def __init__(self):
            self.updated = None

        def filter(self, **kwargs):
            assert kwargs == {"role": UserRole.ADMIN, "is_staff": False}
            return self

        def update(self, **kwargs):
            self.updated = kwargs
            return 7

    class HistoricalUser:
        objects = UserManager()

    class Apps:
        def get_model(self, app_label, model_name):
            assert (app_label, model_name) == ("shop", "User")
            return HistoricalUser

    migration.backfill_admin_role_to_is_staff(Apps(), schema_editor=None)

    assert HistoricalUser.objects.updated == {"is_staff": True}
