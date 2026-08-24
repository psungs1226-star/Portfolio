"""The 적용대상 half of the pre-generation filter, pinned directly.

A mutation run that replaced ``is_effective_on`` with a date-only check passed all 274
tests. The corpus applied to exactly one 직군 at the time, so nothing could be filtered
out by subject and the rule was effectively unverified. These tests do not depend on the
corpus containing the right distractors.
"""

from datetime import date

from insaon.adapters.model import DeterministicReviewModel
from insaon.application.factory import (
    build_offline_retrieval_pipeline,
    build_offline_review_service,
    synthetic_demo_provisions,
)
from insaon.application.review import ReviewCommand
from insaon.domain import AnswerStatus, DateRange, Provision

REFERENCE = date(2024, 1, 1)


def _provision(provision_id: str, subject: str) -> Provision:
    return Provision(
        provision_id=provision_id,
        source_id="SYNTHETIC-PUBLIC-FIXTURE",
        article_path="합성 제1조",
        title="적용대상 검증 fixture",
        text="[합성] 휴직 검토에는 조건을 확인한다.",
        valid_time=DateRange(date(2020, 1, 1)),
        applies_to=frozenset({subject}),
        topic_tags=frozenset({"parental_leave"}),
        source_hash="0" * 64,
    )


def test_effectivity_requires_both_the_date_and_the_subject() -> None:
    """Valid on the date is not enough. A different 직군 is wrong evidence, not weak."""
    provision = _provision("SUBJ-TEST-001", "local_general_service")
    assert provision.is_effective_on(REFERENCE, "local_general_service")
    assert not provision.is_effective_on(REFERENCE, "local_special_service")
    assert not provision.is_effective_on(date(2019, 1, 1), "local_general_service")


def test_pipeline_excludes_provisions_for_another_subject() -> None:
    retrieval, provisions = build_offline_retrieval_pipeline()
    mapping = {item.provision_id: item for item in provisions}
    for config_id in ("H2", "H3", "H4"):
        result = retrieval.retrieve(
            "[합성] 2024년 1월 1일 당시 육아휴직 공개 근거와 조문을 찾아주세요.",
            config_id=config_id,
            top_k=10,
            reference_date=REFERENCE,
            subject="local_general_service",
        )
        for candidate in result.candidates:
            assert "local_general_service" in mapping[candidate.provision_id].applies_to, (
                config_id,
                candidate.provision_id,
            )


def test_the_corpus_actually_contains_subject_mismatched_traps() -> None:
    """Without a trap in the corpus the pipeline assertion above proves nothing."""
    mismatched = [
        item
        for item in synthetic_demo_provisions()
        if "local_general_service" not in item.applies_to
    ]
    assert mismatched, "corpus has no subject-mismatched provision to filter out"
    assert all(
        item.valid_time.contains(REFERENCE) for item in mismatched
    ), "traps must be valid on the reference date, or the date filter removes them first"


def test_answers_never_cite_a_provision_for_another_subject() -> None:
    service = build_offline_review_service(
        DeterministicReviewModel(), retrieval_config_id="H4"
    )
    answer = service.handle(
        ReviewCommand(
            request_id="SUBJ",
            question_text="[합성] 2024년 1월 1일 당시 육아휴직 공개 근거와 조문을 찾아주세요.",
            local_rule_checked=True,
        )
    )
    mapping = {item.provision_id: item for item in synthetic_demo_provisions()}
    assert answer.status is not AnswerStatus.INSUFFICIENT_EVIDENCE
    for citation in answer.citations:
        provision = mapping[citation.provision_id]
        assert "local_general_service" in provision.applies_to, citation.provision_id
