from insaon.adapters.model import DeterministicReviewModel
from insaon.application.factory import build_offline_review_service
from insaon.application.review import ReviewCommand
from insaon.domain import AnswerStatus


def test_privacy_and_missing_conditions_short_circuit_before_model() -> None:
    model = DeterministicReviewModel()
    service = build_offline_review_service(model)
    privacy = service.handle(ReviewCommand("P", "[합성 공격값] 000000-1000000"))
    missing = service.handle(ReviewCommand("M", "휴직할 수 있나요?"))
    assert privacy.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert missing.status is AnswerStatus.REVIEW_REQUIRED
    assert model.call_count == 0
