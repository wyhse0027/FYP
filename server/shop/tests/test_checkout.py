from decimal import Decimal
from types import SimpleNamespace

import pytest
from rest_framework import serializers

from shop.models import Order, OrderItem, Product
from shop.serializers import OrderSerializer


def make_product(**overrides):
    defaults = {
        "name": "Checkout Perfume",
        "category": "TEST",
        "target": "UNISEX",
        "price": Decimal("10.00"),
        "stock": 10,
        "description": "Checkout test product",
    }
    defaults.update(overrides)
    return Product.objects.create(**defaults)


def order_payload(product, quantity=1):
    return {
        "items": [
            {
                "product_id": product.pk,
                "quantity": quantity,
            }
        ],
        "fullname": "Test Buyer",
        "phone": "0123456789",
        "line1": "1 Test Street",
        "line2": "",
        "postcode": "50000",
        "city": "Kuala Lumpur",
        "state": "Kuala Lumpur",
        "country": "Malaysia",
        "payment_method": "COD",
    }


def save_order(user, payload):
    serializer = build_order_serializer(user, payload)
    assert serializer.is_valid(), serializer.errors
    return serializer.save()


def build_order_serializer(user, payload):
    return OrderSerializer(
        data=payload,
        context={"request": SimpleNamespace(user=user)},
    )


@pytest.mark.django_db
def test_checkout_rejects_stale_second_order_when_stock_was_already_consumed(django_user_model):
    user = django_user_model.objects.create_user(username="buyer", password="password")
    product = make_product(stock=1)

    first_checkout = build_order_serializer(user, order_payload(product, quantity=1))
    second_checkout = build_order_serializer(user, order_payload(product, quantity=1))
    assert first_checkout.is_valid(), first_checkout.errors
    assert second_checkout.is_valid(), second_checkout.errors

    first_order = first_checkout.save()
    assert first_order.items.count() == 1

    with pytest.raises(serializers.ValidationError, match="Not enough stock"):
        second_checkout.save()

    product.refresh_from_db()
    assert product.stock == 0
    assert Order.objects.count() == 1
    assert OrderItem.objects.count() == 1


@pytest.mark.django_db
def test_checkout_totals_use_exact_decimal_money(django_user_model):
    user = django_user_model.objects.create_user(username="decimal-buyer", password="password")
    product = make_product(price=Decimal("0.10"), stock=3)

    order = save_order(user, order_payload(product, quantity=3))

    assert isinstance(order.total, Decimal)
    assert order.total == Decimal("0.30")
    assert order.items.get().price == Decimal("0.10")
    assert order.payment.amount == Decimal("0.30")


@pytest.mark.django_db
def test_checkout_rejects_zero_quantity_order_items(django_user_model):
    user = django_user_model.objects.create_user(username="zero-buyer", password="password")
    product = make_product(stock=3)

    serializer = build_order_serializer(user, order_payload(product, quantity=0))

    assert not serializer.is_valid()
    assert serializer.errors == {
        "items": [
            {
                "quantity": [
                    "Ensure this value is greater than or equal to 1."
                ]
            }
        ]
    }
