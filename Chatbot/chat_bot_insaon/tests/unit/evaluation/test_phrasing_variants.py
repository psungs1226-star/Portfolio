"""표기 변형은 의미를 바꾸지 않아야 측정에 쓸 수 있다."""

import pytest

from insaon.application.classification import QuestionClassifier
from insaon.application.conditions import ConditionExtractor
from insaon.domain import ConditionState
from insaon.evaluation.phrasing import attach_particle, dotted_notation, variants

QUESTION = "[합성] 2024-01-01 기준으로 육아휴직 공개 근거 조문을 찾아주세요."


def test_attached_particle_only_removes_the_space_after_the_date() -> None:
    assert attach_particle(QUESTION) == (
        "[합성] 2024-01-01기준으로 육아휴직 공개 근거 조문을 찾아주세요."
    )


def test_dotted_notation_rewrites_the_separator_only() -> None:
    assert dotted_notation(QUESTION) == (
        "[합성] 2024.01.01 기준으로 육아휴직 공개 근거 조문을 찾아주세요."
    )


def test_a_question_without_an_iso_date_yields_no_variant() -> None:
    assert variants("육아휴직 기간 문의") == ()


def test_variants_are_labelled_and_distinct_from_the_original() -> None:
    produced = dict(variants(QUESTION))

    assert set(produced) == {"attached_particle", "dotted_notation"}
    assert all(text != QUESTION for text in produced.values())


@pytest.mark.parametrize("variant_id", ["attached_particle", "dotted_notation"])
def test_every_variant_still_yields_the_same_reference_date(variant_id: str) -> None:
    """변형이 조건 추출을 바꾸면 그건 표기 문제지 의미 문제가 아니다."""
    rewritten = dict(variants(QUESTION))[variant_id]
    conditions = ConditionExtractor().extract(
        rewritten, QuestionClassifier().classify(rewritten)
    )
    reference_date = next(c for c in conditions if c.field_name == "reference_date")

    assert reference_date.state is ConditionState.CONFIRMED
    assert reference_date.value.isoformat() == "2024-01-01"
