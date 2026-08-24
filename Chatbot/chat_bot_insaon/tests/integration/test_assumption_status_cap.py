"""가정으로 채운 결론은 `ANSWERABLE`로 나가지 않는다.

ADR-0016이 "가정에 의존한 결과는 `REVIEW_REQUIRED`보다 낙관적으로 승격하지 않는다"고
정했지만 코드에는 그 상한이 없었다. `deterministic_status`는 `decide()`가 돌려준 값을
그대로 쓰고, `decide()`는 가정으로 채운 필드와 사용자가 답한 필드를 구분하지 않는다.

가정을 넓히기 전에 이 상한이 필요하다. 상한이 없으면 "기존 육아휴직은 없다고 본다"는
가정 하나로 아무 조건도 답하지 않은 질문이 `ANSWERABLE`("가능합니다")까지 간다.
실제로는 이미 3년을 다 쓴 사람일 수 있다.
"""

from datetime import date

from insaon.application.factory import build_offline_review_service
from insaon.application.session import ReviewConversation
from insaon.domain import AnswerStatus


def test_an_answer_resting_on_an_assumption_never_reaches_answerable() -> None:
    service = build_offline_review_service()
    conversation = ReviewConversation(service, request_id="ASSUMED-CAP")

    conversation.ask("2026년 8월 10일 기준 육아휴직 쓸 수 있나요?")
    answer = conversation.ask(
        "자녀 생년월일은 2025년 3월 2일입니다.", local_rule_checked=True
    )

    if answer.assumed_conditions:
        assert answer.status is not AnswerStatus.ANSWERABLE, (
            "가정으로 채운 필드가 있는데 확정 답변으로 나갔다: "
            f"{answer.assumed_conditions}"
        )
        assert "normal_case_assumptions_applied" in answer.review_reasons


def test_the_same_question_answered_in_full_still_reaches_answerable() -> None:
    """상한이 모든 확정 답변을 막아버리면 제품이 결론을 내지 못한다."""
    service = build_offline_review_service()
    conversation = ReviewConversation(service, request_id="FULL-ANSWER")

    conversation.ask("2026년 8월 10일 기준 육아휴직 쓸 수 있나요?")
    answer = conversation.ask(
        "자녀 생년월일은 2025년 3월 2일이고 같은 자녀 기존 육아휴직은 없습니다.",
        local_rule_checked=True,
    )

    assert answer.assumed_conditions == ()
    assert answer.status is AnswerStatus.ANSWERABLE
    assert date(2026, 8, 10)


def test_an_explicit_prior_leave_period_replaces_the_assumption() -> None:
    """사용자가 실제 값을 말하면 가정은 사라진다.

    `override > normal_case_assumption > unknown` (ADR-0016). 가정이 명시값을 덮으면
    사용자가 준 사실을 제품이 무시하는 것이 된다.
    """
    service = build_offline_review_service()
    conversation = ReviewConversation(service, request_id="EXPLICIT-OVERRIDE")

    conversation.ask("2026년 8월 10일 기준 육아휴직 쓸 수 있나요?")
    answer = conversation.ask(
        "자녀 생년월일은 2025년 3월 2일이고 "
        "같은 자녀 기존 육아휴직은 2024-01-01부터 2024-06-30까지입니다.",
        local_rule_checked=True,
    )

    assert answer.assumed_conditions == ()
    assert "previous_leave_periods" in answer.confirmed_conditions
    assert answer.status is AnswerStatus.ANSWERABLE


def test_the_parental_lane_still_stores_the_fact_the_user_actually_supplied() -> None:
    """가정으로 채운 필드는 세션에 저장하지 않는다(ADR-0016).

    저장하면 다음 턴에서 사용자가 확인해 준 사실과 구분되지 않고, 가정이 조용히
    확정 사실로 승격한다.
    """
    from insaon.api.reviews import InMemoryReviewSessionStore, ReviewApiService

    store = InMemoryReviewSessionStore()
    service = ReviewApiService(build_offline_review_service(), store)
    session_id, first = service.create(
        question_text="2026-08-10 육아휴직 조건",
        idempotency_key="PARENTAL-STORE-FIRST",
        local_rule_checked=False,
    )

    stored = {item.field_name for item in store.get(session_id).structured_conditions}

    assert first.assumed_conditions == ("previous_leave_periods",)
    assert "previous_leave_periods" not in stored
    assert all(
        item.provenance != "normal_case_assumption"
        for item in store.get(session_id).structured_conditions
    )
