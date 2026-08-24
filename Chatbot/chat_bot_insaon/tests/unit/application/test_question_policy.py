from insaon.application.classification import QuestionClassifier
from insaon.application.conditions import ConditionExtractor, QuestionPolicy
from insaon.domain import (
    AnswerStatus,
    ConditionState,
    ConditionValue,
    ExpectedAction,
    LocalRuleStatus,
)


def decide(text: str, checked: bool = False):
    classification = QuestionClassifier().classify(text)
    conditions = ConditionExtractor().extract(text, classification)
    status = LocalRuleStatus.CHECKED if checked else LocalRuleStatus.UNCONFIRMED
    return QuestionPolicy().decide(classification, conditions, status)


def test_missing_conditions_ask_in_stable_order_without_retrieval() -> None:
    decision = decide("휴직을 연장할 수 있나요?")
    assert decision.action is ExpectedAction.ASK
    assert decision.missing_fields[:2] == ("leave_type", "reference_date")


def test_evidence_lookup_can_retrieve_but_unconfirmed_local_rule_requires_review() -> None:
    decision = decide("2024-01-01 질병휴직 공개 규정을 찾아주세요")
    assert decision.action is ExpectedAction.ANSWER
    assert decision.answer_status is AnswerStatus.REVIEW_REQUIRED
    assert decision.reason_codes == ("local_rule_unconfirmed",)


def test_wide_evidence_topics_never_inherit_leave_type_requirements() -> None:
    classifier = QuestionClassifier()
    extractor = ConditionExtractor()
    policy = QuestionPolicy()
    cases = {
        "승진 평정 기준 근거": "performance_and_promotion",
        "징계 소청 절차 조문": "discipline_and_appeal",
    }

    for question, expected_topic in cases.items():
        classification = classifier.classify(question)
        conditions = extractor.extract(question, classification)
        decision = policy.decide(classification, conditions)

        assert classification.review_tier == "evidence_only"
        assert classification.topic == expected_topic
        # `task`는 사용자가 말한 조건이 아니라 이 턴이 무슨 턴이었는지의 기록이다.
        # 생략형 후속이 앞 턴의 과업을 이어받는 데만 쓰이므로 여기서는 뺀다.
        assert {
            condition.field_name for condition in conditions if condition.field_name != "task"
        } == {
            "topic",
            "reference_date",
        }
        # 기준일은 오늘로 가정하고 진행한다(ADR-0026). 되묻지 않는다는 것이지
        # 조용히 채운다는 뜻은 아니며, 가정 사실은 답변에 실린다.
        assert decision.action is ExpectedAction.ANSWER
        assert decision.missing_fields == ()
        assert "leave_type" not in decision.missing_fields


def test_dated_wide_evidence_topics_return_review_without_leave_gate() -> None:
    for question in (
        "2026-08-01 승진 평정 기준 근거",
        "2026-08-01 징계 소청 절차 조문",
    ):
        decision = decide(question)

        assert decision.action is ExpectedAction.ANSWER
        assert decision.answer_status is AnswerStatus.REVIEW_REQUIRED
        assert decision.missing_fields == ()
        assert decision.reason_codes == ("evidence_only_human_review",)


def test_regular_service_allowance_requires_decisive_pay_facts() -> None:
    decision = decide(
        "2026년 4월 1일 육아휴직 복직자의 2026년 상반기 "
        "정근수당은 100%인가 50%인가?"
    )

    assert decision.action is ExpectedAction.ASK
    assert decision.missing_fields == ("leave_periods",)


def test_regular_service_allowance_does_not_reask_facts_in_natural_korean_question() -> None:
    decision = decide(
        "2025년 5월 말부터 2026년 4월 1일자 육아휴직한 복직자의 "
        "2026년도 상반기 정근수당은 100%야 50%야?"
    )

    assert decision.action is ExpectedAction.ANSWER
    assert decision.answer_status is AnswerStatus.REVIEW_REQUIRED
    assert decision.missing_fields == ()


def test_regular_allowance_normal_assumptions_leave_only_core_facts_missing() -> None:
    question = (
        "2026년 4월 1일 육아휴직 복직자의 2026년 상반기 "
        "정근수당은 100%인가 50%인가?"
    )
    classification = QuestionClassifier().classify(question)
    conditions = ConditionExtractor().extract(question, classification)
    normal_assumptions = (
        ("prior_same_child_leave_months", 0),
        ("salary_on_payment_date", True),
        ("disciplinary_action_in_period", False),
        ("other_nonservice_periods", ()),
        ("annual_salary_exclusion_applies", False),
    )
    conditions += tuple(
        ConditionValue(name, value, ConditionState.CONFIRMED, "normal_case_assumption")
        for name, value in normal_assumptions
    )

    decision = QuestionPolicy().decide(classification, conditions)

    assert decision.action is ExpectedAction.ASK
    assert decision.missing_fields == ("leave_periods",)
