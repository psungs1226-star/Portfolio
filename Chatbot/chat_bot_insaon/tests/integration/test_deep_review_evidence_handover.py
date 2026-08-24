"""모델 문장이 검증에 걸려도 찾은 조문은 넘긴다.

local 프로필에서 휴직 4종을 돌리면 육아휴직과 가족돌봄이 `INSUFFICIENT_EVIDENCE` +
인용 0건으로 끝났다(2/4). Qwen이 인용문에 없는 숫자를 써서 수량 게이트에 걸린 것이고,
게이트는 제 일을 했다. 문제는 그 다음이다. 검색은 성공했고 조문은 시점·인용 검증을
통과했는데 전부 버리고 "근거가 부족합니다"라고 답했다.

사용자에게는 검색이 실패한 것으로 보인다. 결론을 못 내는 것과 근거를 못 찾는 것은
다른 일이고, 화면은 그 둘을 구분해서 말해야 한다.

결론은 여전히 만들지 않는다(CLAUDE.md CRITICAL). 확인한 조건과 근거 조문을 짚어주고
판단만 넘긴다.
"""

from datetime import date

from insaon.application.factory import build_offline_review_service
from insaon.application.session import ReviewConversation
from insaon.domain import AnswerStatus, Claim, ReviewDraft


class _UngroundedDeepModel:
    """인용문에 없는 기간을 쓰는 모델. Qwen이 실제로 이렇게 답했다."""

    model_id = "ungrounded-deep-model"

    def draft(self, context, provisions, allowed_citations):  # type: ignore[no-untyped-def]
        return ReviewDraft(
            AnswerStatus.ANSWERABLE,
            (
                Claim(
                    claim_id="CLAIM-INVENTED",
                    text="육아휴직은 자녀 출생 후 18개월 이내로 인정됩니다.",
                    citation_ids=tuple(item.citation_id for item in allowed_citations),
                ),
            ),
        )


def _answer():  # type: ignore[no-untyped-def]
    service = build_offline_review_service(_UngroundedDeepModel())  # type: ignore[arg-type]
    conversation = ReviewConversation(service, request_id="DEEP-HANDOVER")
    conversation.ask("2026년 8월 10일 기준 육아휴직 쓸 수 있나요?")
    return conversation.ask(
        "자녀 생년월일은 2025년 3월 2일이고 같은 자녀 기존 육아휴직은 없습니다.",
        local_rule_checked=True,
    )


def test_a_rejected_draft_hands_over_the_provisions_instead_of_abstaining() -> None:
    answer = _answer()

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.citations, "검증을 통과한 조문을 버리지 않는다"
    assert answer.claims == (), "지어낸 문장은 내보내지 않는다"
    assert "18개월" not in answer.short_answer


def test_the_handover_names_the_conditions_and_the_articles_to_read() -> None:
    """"담당자가 판단하세요"로 끝내지 않는다. 무엇을 확인했고 어느 조문을 볼지 말한다."""
    answer = _answer()

    assert "자녀 생년월일" in answer.short_answer
    for citation in answer.citations:
        assert citation.article_path in answer.short_answer


def test_the_discarded_draft_is_disclosed_not_hidden() -> None:
    answer = _answer()

    assert "claim_quantity_unsupported" in answer.review_reasons
    assert "model_draft_discarded" in answer.review_reasons
    assert any("초안" in item for item in answer.limitations)
    assert answer.data_as_of <= date(2027, 1, 1)
