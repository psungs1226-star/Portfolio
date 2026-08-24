"""인용은 전부 실재하는데 결론 숫자만 지어낸 답변을 끝까지 태워 본다.

실모델 1회 실행에서 실제로 나온 실패다. Qwen3 4B가 "육아휴직 기간은 자녀 출생 후
6개월 이내로 인정됩니다"를 만들었고, 인용 6건이 전부 실재·유효했기 때문에 검증을 통과해
`ANSWERABLE`로 나갔다. corpus 101건 어디에도 `6개월`은 없다.

Ollama 없이 같은 형태를 재현하기 위해, 허용된 인용만 쓰되 문장에 없는 수량을 넣는
모델을 세운다.
"""

from collections.abc import Sequence

from insaon.adapters.model import DeterministicReviewModel
from insaon.application.factory import build_offline_review_service
from insaon.application.review import ReviewCommand
from insaon.domain import (
    AnswerStatus,
    Citation,
    Claim,
    ClaimKind,
    Provision,
    QuestionContext,
    ReviewDraft,
)

QUESTION = "기준일 2026-03-02 자녀 생년월일 2024-05-10 이전 육아휴직 없음 육아휴직 기간 문의"


class _InventedQuantityModel:
    """허용된 인용만 붙이면서 인용문에 없는 기간을 결론으로 쓰는 모델."""

    model_id = "test-invented-quantity"

    def __init__(self, sentence: str) -> None:
        self._sentence = sentence

    def draft(
        self,
        context: QuestionContext,
        provisions: Sequence[Provision],
        allowed_citations: Sequence[Citation],
    ) -> ReviewDraft:
        citation_ids = tuple(citation.citation_id for citation in allowed_citations)
        return ReviewDraft(
            recommended_status=AnswerStatus.ANSWERABLE,
            claims=(
                Claim(
                    claim_id="CLAIM-1",
                    text=self._sentence,
                    citation_ids=citation_ids,
                    kind=ClaimKind.REVIEW_POSITION,
                ),
                Claim(
                    claim_id="CLAIM-2",
                    text="질문 기준일과 부칙 시행일에 맞는 본문·단서를 함께 대조해 주세요.",
                    citation_ids=citation_ids,
                    kind=ClaimKind.BASIS,
                ),
            ),
        )


def _answer(model: object) -> object:
    service = build_offline_review_service(model, retrieval_config_id="H4")  # type: ignore[arg-type]
    return service.handle(
        ReviewCommand(request_id="GROUND-1", question_text=QUESTION, local_rule_checked=True)
    )


def test_invented_period_cannot_reach_answerable() -> None:
    answer = _answer(
        _InventedQuantityModel(
            "육아휴직 기간은 자녀 출생 후 6개월 이내로 인정됩니다."
        )
    )

    assert answer.status is not AnswerStatus.ANSWERABLE
    assert "claim_quantity_unsupported" in answer.review_reasons


def test_the_same_sentence_without_the_invented_number_is_not_blocked() -> None:
    """수량만 막는다. 근거 없는 서술 전체를 막는 장치가 아니다."""
    answer = _answer(
        _InventedQuantityModel("육아휴직 기간은 자녀 조건에 따라 검토합니다.")
    )

    assert "claim_quantity_unsupported" not in answer.review_reasons


def test_repeating_the_asker_own_dates_is_not_treated_as_invention() -> None:
    answer = _answer(
        _InventedQuantityModel(
            "기준일 2026년 3월 2일 기준 자녀 생년월일은 2024년 5월 10일입니다."
        )
    )

    assert "claim_quantity_unsupported" not in answer.review_reasons


def test_deterministic_demo_path_is_unaffected() -> None:
    answer = _answer(DeterministicReviewModel())

    assert answer.status is AnswerStatus.ANSWERABLE
    assert "claim_quantity_unsupported" not in answer.review_reasons
