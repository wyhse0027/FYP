import pytest
from rest_framework.test import APIClient


@pytest.fixture
def users(django_user_model):
    user = django_user_model.objects.create_user(
        username="ordinary-user",
        password="password",
        role="user",
        is_staff=False,
    )
    admin = django_user_model.objects.create_user(
        username="staff-admin",
        password="password",
        role="admin",
        is_staff=True,
    )
    return user, admin


@pytest.mark.django_db
@pytest.mark.parametrize(
    "url",
    [
        "/api/ar/999999/delete-marker/",
        "/api/ar/999999/delete-glb/",
        "/api/ar/999999/delete-mind/",
    ],
)
def test_legacy_ar_delete_views_are_admin_only(url, users):
    user, admin = users
    client = APIClient()

    assert client.delete(url).status_code == 401

    client.force_authenticate(user)
    assert client.delete(url).status_code == 403

    client.force_authenticate(admin)
    assert client.delete(url).status_code == 404
