import pytest
from rest_framework.test import APIClient

from shop.models import Product, Quiz, QuizAnswer, QuizQuestion, QuizResult


def make_product(name, category):
    return Product.objects.create(
        name=name,
        category=category,
        target="UNISEX",
        price="1.00",
        stock=10,
        description=f"{name} fixture",
    )


def make_quiz_with_answer(title, category):
    quiz = Quiz.objects.create(title=title)
    question = QuizQuestion.objects.create(quiz=quiz, text=f"{title} question")
    answer = QuizAnswer.objects.create(
        question=question,
        answer_text=f"{category} answer",
        category=category,
    )
    return quiz, answer


@pytest.fixture
def authenticated_client(django_user_model):
    user = django_user_model.objects.create_user(username="quiz-user", password="password")
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_quiz_submit_rejects_only_foreign_quiz_answers(authenticated_client):
    owned_quiz, _owned_answer = make_quiz_with_answer("Owned quiz", "Fresh")
    _foreign_quiz, foreign_answer = make_quiz_with_answer("Foreign quiz", "Bold")
    make_product("Fresh product", "Fresh")
    make_product("Bold product", "Bold")

    response = authenticated_client.post(
        "/api/quiz-submit/",
        {"quiz": owned_quiz.pk, "answers": [foreign_answer.pk]},
        format="json",
    )

    assert response.status_code == 400
    assert response.json() == {"error": "No answers provided"}
    assert QuizResult.objects.count() == 0


@pytest.mark.django_db
def test_quiz_submit_scores_only_answers_from_submitted_quiz(authenticated_client):
    owned_quiz, owned_answer = make_quiz_with_answer("Owned quiz", "Fresh")
    _foreign_quiz, foreign_answer = make_quiz_with_answer("Foreign quiz", "Bold")
    fresh_product = make_product("Fresh product", "Fresh")
    bold_product = make_product("Bold product", "Bold")

    response = authenticated_client.post(
        "/api/quiz-submit/",
        {"quiz": owned_quiz.pk, "answers": [foreign_answer.pk, owned_answer.pk]},
        format="json",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["recommended_category"] == "Fresh"
    product_ids = {product["id"] for product in body["recommended_products"]}
    assert fresh_product.pk in product_ids
    assert bold_product.pk not in product_ids
