from datetime import date

from insaon.adapters.model import DeterministicReviewModel
from insaon.application.factory import (
    build_offline_retrieval_pipeline,
    build_offline_review_service,
)
from insaon.application.review import ReviewCommand
from insaon.domain import AnswerStatus


def _answer(question: str, config_id: str = "H4"):  # type: ignore[no-untyped-def]
    service = build_offline_review_service(
        DeterministicReviewModel(), retrieval_config_id=config_id
    )
    return service.handle(ReviewCommand(request_id="Q", question_text=question))


def test_practitioner_wording_reaches_the_question_instead_of_being_denied() -> None:
    """"출산 후 언제부터 쉴 수 있나요" is a leave question written without the word 휴직."""
    answer = _answer("출산 후 언제부터 쉴 수 있나요")
    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert "no_supported_topic_signal" not in answer.review_reasons


def test_expansion_never_decides_the_leave_type() -> None:
    """Scope may open on practitioner wording; the leave type may not be guessed.

    "애 키우느라" reads as 육아휴직 to a person, but 가족돌봄휴직 is also reachable from
    the same sentence and picking wrong changes the conclusion rather than degrading it.
    """
    answer = _answer("직원이 애 키우느라 쉬겠다는데 뭘 확인해야 하나요")
    assert "leave_type" in answer.missing_conditions
    assert answer.status is AnswerStatus.REVIEW_REQUIRED


def test_unrelated_questions_still_abstain() -> None:
    """Expansion must not reopen the scope hole that phase 15 closed."""
    for question in ("오늘 날씨 어때", "점심 뭐 먹지", "주식 뭐 사지"):
        answer = _answer(question)
        assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE
        assert "no_supported_topic_signal" in answer.review_reasons


def test_h4_differs_from_h3_only_where_the_question_avoids_statutory_words() -> None:
    retrieval, _ = build_offline_retrieval_pipeline()

    def top(config_id: str, query: str) -> list[str]:
        result = retrieval.retrieve(
            query,
            config_id=config_id,
            top_k=5,
            reference_date=date(2024, 1, 1),
            subject="local_general_service",
        )
        return [item.provision_id for item in result.candidates]

    statutory = "[합성] 2024년 1월 1일 당시 육아휴직 공개 근거와 조문을 찾아주세요."
    assert top("H4", statutory) == top("H3", statutory)

    practitioner = "직원이 아파서 한동안 못 나온다는데 다시 나올 때 뭘 봐야 하죠"
    assert "SYNTHETIC-EVIDENCE-B-001" in top("H4", practitioner)
    assert "SYNTHETIC-EVIDENCE-B-001" not in top("H3", practitioner)
