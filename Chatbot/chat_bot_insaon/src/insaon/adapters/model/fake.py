from __future__ import annotations

from collections.abc import Sequence

from insaon.domain import (
    AnswerStatus,
    Citation,
    Claim,
    ClaimKind,
    Provision,
    QuestionContext,
    ReviewDraft,
)


class DeterministicReviewModel:
    """Offline model adapter that only references caller-approved citation IDs."""

    model_id = "deterministic-review-model-v1"

    def __init__(self) -> None:
        self.call_count = 0

    def draft(
        self,
        context: QuestionContext,
        provisions: Sequence[Provision],
        allowed_citations: Sequence[Citation],
    ) -> ReviewDraft:
        self.call_count += 1
        if not provisions or not allowed_citations:
            return ReviewDraft(AnswerStatus.INSUFFICIENT_EVIDENCE, ())
        # 접두사로 판정한다. 이전에는 `SYNTHETIC-PUBLIC-FIXTURE` 하나만 합성으로 봤는데,
        # 넓은 인사규정 lane의 조문이 `SYNTHETIC-WIDE-*` source를 쓰면서 합성 자료가
        # 화면에 "공식 공개 근거"로 표시됐다. 합성을 공식이라고 부르지 않는다.
        evidence_kind = (
            "예시 공개 근거"
            if all(item.source_id.startswith("SYNTHETIC") for item in provisions)
            else "공식 공개 근거"
        )
        # 부칙·단서가 실제로 회수된 경우에만 그것을 대조하라고 말한다. 넓은 lane의
        # 근거에는 부칙이 없는데도 휴직 검토용 문구를 그대로 쓰고 있었다.
        has_supplementary = any(
            {"supplementary", "proviso"} & set(item.topic_tags) for item in provisions
        )
        is_wide_evidence = any("wide_evidence" in item.topic_tags for item in provisions)
        asks_for_decision = any(
            token in context.question_text for token in ("가능", "해당", "여부", "인가")
        )
        recommended_status = (
            AnswerStatus.REVIEW_REQUIRED if asks_for_decision else AnswerStatus.ANSWERABLE
        )
        decision_subject = (
            "지급률"
            if any("지급률" in item.text for item in provisions)
            else "복직 가능 여부"
        )
        position = (
            f"현재 연결된 근거에는 조건에 따른 결과 규칙이 없어 {decision_subject}를 "
            "확정하기는 어려워요."
            if asks_for_decision
            else f"질문 기준일에 유효한 {evidence_kind}를 확인했어요."
        )
        claims = (
            Claim(
                claim_id="CLAIM-REVIEW-POSITION",
                text=position,
                citation_ids=tuple(citation.citation_id for citation in allowed_citations),
                kind=ClaimKind.REVIEW_POSITION,
            ),
            Claim(
                claim_id="CLAIM-REVIEW-BASIS",
                text=(
                    "이 주제는 근거 조문까지 확인해 드려요. 조건을 따져 결론을 내는 검토는"
                    " 휴직·복직에서만 제공하므로 나머지는 담당자가 판단해 주세요."
                    if is_wide_evidence
                    else "질문 기준일과 부칙 시행일에 맞는 본문·단서를 함께 대조해 주세요."
                    if has_supplementary
                    else "질문 기준일에 유효한 본문을 원문으로 대조해 주세요."
                ),
                citation_ids=tuple(citation.citation_id for citation in allowed_citations),
                kind=ClaimKind.BASIS,
            ),
            Claim(
                claim_id="CLAIM-REVIEW-NEXT-CHECK",
                text="기관 규정과 실제 사실관계를 확인한 뒤 최종 판단해 주세요.",
                citation_ids=tuple(citation.citation_id for citation in allowed_citations),
                kind=ClaimKind.NEXT_CHECK,
            ),
        )
        return ReviewDraft(recommended_status, claims)
