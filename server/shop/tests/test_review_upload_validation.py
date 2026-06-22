from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from shop.models import Product, Review
from shop.serializers import ReviewSerializer


MIB = 1024 * 1024


def uploaded_file(name, content_type, size=1):
    upload = SimpleUploadedFile(name, b"x" if size else b"", content_type=content_type)
    upload.size = size
    return upload


@pytest.fixture
def review_context(django_user_model):
    user = django_user_model.objects.create_user(
        username="reviewer",
        password="password",
    )
    product = Product.objects.create(
        name="Review Validation Product",
        category="TEST",
        price="1.00",
        stock=1,
        description="Review validation fixture",
    )
    return SimpleNamespace(user=user), product


def create_serializer(request, product, files):
    return ReviewSerializer(
        data={
            "product_id": product.pk,
            "rating": 5,
            "comment": "Validated upload",
            "files": files,
        },
        context={"request": request},
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("name", "content_type", "size", "expected_type"),
    [
        ("photo.jpg", "image/jpeg", 10 * MIB, "IMAGE"),
        ("photo.png", "image/png", 10 * MIB, "IMAGE"),
        ("photo.webp", "image/webp", 10 * MIB, "IMAGE"),
        ("clip.mp4", "video/mp4", 50 * MIB, "VIDEO"),
        ("clip.webm", "video/webm", 50 * MIB, "VIDEO"),
    ],
)
@patch("shop.serializers.ReviewMedia.objects.create")
def test_allowed_media_boundaries_are_accepted_with_validated_type(
    media_create, name, content_type, size, expected_type, review_context
):
    request, product = review_context
    serializer = create_serializer(
        request,
        product,
        [uploaded_file(name, content_type, size)],
    )

    assert serializer.is_valid(), serializer.errors
    serializer.save()

    assert media_create.call_args.kwargs["type"] == expected_type


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("name", "content_type", "size"),
    [
        ("empty.jpg", "image/jpeg", 0),
        ("large.jpg", "image/jpeg", 10 * MIB + 1),
        ("large.mp4", "video/mp4", 50 * MIB + 1),
        ("payload.exe", "application/x-msdownload", 1),
        ("page.html", "text/html", 1),
        ("photo.jpg", "image/png", 1),
        ("clip.mp4", "video/webm", 1),
    ],
)
@patch("shop.serializers.ReviewMedia.objects.create")
def test_invalid_media_is_rejected_before_media_creation(
    media_create, name, content_type, size, review_context
):
    request, product = review_context
    serializer = create_serializer(
        request,
        product,
        [uploaded_file(name, content_type, size)],
    )

    is_valid = serializer.is_valid()
    if is_valid:
        serializer.save()

    assert not is_valid
    media_create.assert_not_called()


@pytest.mark.django_db
@patch("shop.serializers.ReviewMedia.objects.create")
def test_more_than_five_files_is_rejected_before_media_creation(
    media_create, review_context
):
    request, product = review_context
    files = [uploaded_file(f"photo-{index}.jpg", "image/jpeg") for index in range(6)]
    serializer = create_serializer(request, product, files)

    is_valid = serializer.is_valid()
    if is_valid:
        serializer.save()

    assert not is_valid
    media_create.assert_not_called()


@pytest.mark.django_db
@patch("shop.serializers.ReviewMedia.objects.create")
def test_update_rejects_invalid_media_before_media_creation(
    media_create, review_context
):
    request, product = review_context
    review = Review.objects.create(
        user=request.user,
        product=product,
        rating=5,
        comment="Existing review",
    )
    serializer = ReviewSerializer(
        review,
        data={"files": [uploaded_file("photo.jpg", "text/html")]},
        partial=True,
        context={"request": request},
    )

    is_valid = serializer.is_valid()
    if is_valid:
        serializer.save()

    assert not is_valid
    media_create.assert_not_called()


@pytest.mark.django_db
@patch("shop.serializers.ReviewMedia.objects.create")
def test_update_uses_validated_media_type(media_create, review_context):
    request, product = review_context
    review = Review.objects.create(
        user=request.user,
        product=product,
        rating=5,
        comment="Existing review",
    )
    serializer = ReviewSerializer(
        review,
        data={"files": [uploaded_file("clip.webm", "video/webm")]},
        partial=True,
        context={"request": request},
    )

    assert serializer.is_valid(), serializer.errors
    serializer.save()

    assert media_create.call_args.kwargs["type"] == "VIDEO"
