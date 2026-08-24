from insaon.application.factory import build_offline_review_service
from insaon.application.review import ReviewCommand
from insaon.domain import AnswerStatus


def test_pipeline_returns_all_three_safe_statuses() -> None:
    service = build_offline_review_service()
    ask = service.handle(ReviewCommand("A", "휴직을 연장할 수 있나요?"))
    answer = service.handle(
        ReviewCommand(
            "B",
            "2024-01-01 질병휴직 공개 근거를 찾아주세요",
            local_rule_checked=True,
        )
    )
    abstain = service.handle(ReviewCommand("C", "국가공무원 징계 처분을 확정해 주세요"))
    assert ask.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.status is AnswerStatus.ANSWERABLE
    assert abstain.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert answer.citations
