from datetime import UTC, date, datetime

import pytest

from insaon.domain import (
    AnswerStatus,
    Citation,
    DateRange,
    ReviewAnswer,
    SourceDocument,
)


def test_valid_time_is_half_open() -> None:
    interval = DateRange(date(2024, 1, 1), date(2025, 1, 1))
    assert interval.contains(date(2024, 1, 1))
    assert interval.contains(date(2024, 12, 31))
    assert not interval.contains(date(2025, 1, 1))


def test_answerable_requires_verified_citation_and_no_missing_condition() -> None:
    with pytest.raises(ValueError):
        ReviewAnswer(status=AnswerStatus.ANSWERABLE, short_answer="검토용")

    citation = Citation(
        citation_id="C-1",
        source_id="S-1",
        provision_id="P-1",
        source_name="합성 공개자료",
        article_path="합성 제1조",
        effective_from=date(2024, 1, 1),
        effective_to=None,
        source_url="https://example.invalid/source",
    )
    answer = ReviewAnswer(
        status=AnswerStatus.ANSWERABLE,
        short_answer="담당자가 원문을 검토할 수 있습니다.",
        citations=(citation,),
        data_as_of=date(2026, 7, 29),
    )
    assert answer.status is AnswerStatus.ANSWERABLE


def test_review_answer_keeps_assumptions_separate_from_confirmed_conditions() -> None:
    answer = ReviewAnswer(
        status=AnswerStatus.REVIEW_REQUIRED,
        short_answer="가정 기반 검토",
        confirmed_conditions=("reinstatement_date",),
        assumed_conditions=("salary_on_payment_date",),
        assumption_profile_id="regular-service-allowance-normal-v1",
    )

    assert answer.confirmed_conditions == ("reinstatement_date",)
    assert answer.assumed_conditions == ("salary_on_payment_date",)
    assert answer.assumption_profile_id == "regular-service-allowance-normal-v1"


def test_review_answer_rejects_unversioned_assumptions() -> None:
    with pytest.raises(ValueError, match="assumption profile id"):
        ReviewAnswer(
            status=AnswerStatus.REVIEW_REQUIRED,
            short_answer="조건부 검토",
            assumed_conditions=("salary_on_payment_date",),
        )


def test_review_answer_rejects_overlapping_condition_states() -> None:
    with pytest.raises(ValueError, match="must be disjoint"):
        ReviewAnswer(
            status=AnswerStatus.REVIEW_REQUIRED,
            short_answer="조건 확인",
            confirmed_conditions=("leave_periods",),
            missing_conditions=("leave_periods",),
        )


def test_source_document_separates_valid_and_system_time() -> None:
    source = SourceDocument(
        source_id="S-1",
        source_name="합성 공개자료",
        source_type="manual",
        issuer="SYNTHETIC",
        official_source_id="OFFICIAL-1",
        promulgation_date=date(2023, 1, 1),
        valid_time=DateRange(date(2024, 1, 1)),
        retrieved_at=datetime(2026, 7, 29, tzinfo=UTC),
        source_url="https://example.invalid/source",
        content_hash="a" * 64,
        parser_version="0.1.0",
        system_time=DateRange(date(2026, 7, 29)),
    )
    assert source.valid_time.start != source.system_time.start
