from insaon.application.classification import QuestionClassifier
from insaon.application.conditions import ConditionExtractor, QuestionPolicy
from insaon.domain import ExpectedAction


def test_case_a_never_retrieves_before_decisive_conditions() -> None:
    text = "휴직을 연장하거나 다른 유형으로 신청할 수 있나요?"
    classification = QuestionClassifier().classify(text)
    decision = QuestionPolicy().decide(
        classification, ConditionExtractor().extract(text, classification)
    )
    assert decision.action is ExpectedAction.ASK
    assert decision.missing_fields == ("leave_type", "reference_date")
