from insaon.application.classification import QuestionClassifier
from insaon.domain import LeaveType


def test_classifier_covers_four_leave_types_and_reinstatement() -> None:
    classifier = QuestionClassifier()
    cases = {
        "육아휴직을 검토해 주세요": LeaveType.PARENTAL,
        "질병 휴직 복직 근거": LeaveType.MEDICAL,
        "가족돌봄휴직 조건": LeaveType.FAMILY_CARE,
        "자기개발휴직 신청": LeaveType.SELF_DEVELOPMENT,
    }
    for question, expected in cases.items():
        assert classifier.classify(question).leave_type is expected
    assert classifier.classify("질병휴직 후 복직").is_reinstatement


def test_classifier_does_not_guess_ambiguous_or_out_of_scope() -> None:
    classifier = QuestionClassifier()
    assert classifier.classify("휴직할 수 있나요?").leave_type is LeaveType.UNKNOWN
    out = classifier.classify("국가공무원 징계 처분을 확정해 주세요")
    assert not out.in_scope
    assert out.leave_type is LeaveType.OUT_OF_SCOPE


def test_classifier_denies_questions_without_any_supported_topic_signal() -> None:
    classifier = QuestionClassifier()
    for question in (
        "오늘 날씨 어때",
        "점심시간은 몇 시부터인가요?",
        "우리 팀 워크숍 예산은 어디서 확인하죠?",
        "계약직 재계약 절차 알려줘",
    ):
        result = classifier.classify(question)
        assert not result.in_scope, question
        assert result.leave_type is LeaveType.OUT_OF_SCOPE, question
        assert result.intent == "out_of_scope", question
        assert result.reason_code == "no_supported_topic_signal", question


def test_classifier_keeps_leave_questions_in_scope_even_without_a_type() -> None:
    classifier = QuestionClassifier()
    for question in (
        "휴직을 연장할 수 있나요?",
        "복직 절차가 궁금합니다",
    ):
        result = classifier.classify(question)
        assert result.in_scope, question
        assert result.leave_type is LeaveType.UNKNOWN, question


def test_classifier_routes_wide_personnel_topics_to_evidence_only_review() -> None:
    classifier = QuestionClassifier()
    cases = {
        "2026-08-01 신규임용 관련 규정을 찾아주세요": "appointment",
        "2026-08-01 인사기록카드 근거를 찾아주세요": "personnel_records",
        "2026-08-01 승진 평정 기준 근거": "performance_and_promotion",
        "2026-08-01 연가 복무 규정": "service_and_leave",
        "2026-08-01 초과근무수당 근거": "pay_and_allowance",
        "2026-08-01 징계 소청 절차 조문": "discipline_and_appeal",
        "2026-08-01 위탁교육 의무복무 근거": "training",
        "2026-08-01 명예퇴직수당 규정": "retirement",
    }
    for question, topic in cases.items():
        result = classifier.classify(question)
        assert result.in_scope
        assert result.intent == "evidence_lookup"
        assert result.review_tier == "evidence_only"
        assert result.topic == topic

    final_decision = classifier.classify("승진 심사 결과를 최종 판단해 주세요")
    assert not final_decision.in_scope


def test_classifier_routes_generic_personnel_regulation_query_to_all_evidence() -> None:
    result = QuestionClassifier().classify(
        "2026-08-01 지방공무원 전체 인사규정 근거를 찾아주세요"
    )

    assert result.in_scope
    assert result.leave_type is LeaveType.UNKNOWN
    assert result.intent == "evidence_lookup"
    assert result.review_tier == "evidence_only"
    assert result.topic == "all_personnel"


def test_regular_service_allowance_after_leave_enters_derived_deep_review() -> None:
    result = QuestionClassifier().classify(
        "2026년 4월 1일 육아휴직 복직자의 2026년 상반기 정근수당은 100%인가 50%인가?"
    )

    assert result.in_scope
    assert result.topic == "pay_and_allowance"
    assert result.review_tier == "deep_review"
    assert result.intent == "regular_service_allowance_review"


def test_non_parental_allowance_question_stays_in_evidence_only_lane() -> None:
    result = QuestionClassifier().classify(
        "질병휴직자의 정근수당 지급 기준을 찾아주세요"
    )

    assert result.in_scope
    assert result.leave_type is LeaveType.MEDICAL
    assert result.topic == "pay_and_allowance"
    assert result.review_tier == "evidence_only"
    assert result.intent == "evidence_lookup"


def test_words_a_officer_actually_types_reach_the_topic_that_holds_the_answer() -> None:
    """조문을 넣어도 그 조문에 닿는 말을 모르면 회수되지 않는다.

    corpus에 `직위해제`와 `공가` 조문을 넣은 뒤에도 두 질문은 근거 0건으로 끝났다.
    분류기 어휘에 그 단어가 없어 주제 자체가 정해지지 않았기 때문이다. 조문을 늘리는
    일과 그 조문에 닿는 말을 늘리는 일은 같이 해야 한다.
    """
    classifier = QuestionClassifier()
    cases = {
        "2026-08-10 직위해제 사유 근거를 찾아주세요": "discipline_and_appeal",
        "2026-08-10 예비군 소집 공가 근거를 찾아주세요": "service_and_leave",
        "2026-08-10 경조사 휴가 일수 근거를 찾아주세요": "service_and_leave",
        "2026-08-10 임용 결격사유 근거를 찾아주세요": "appointment",
        "2026-08-10 시보 기간 계산 근거를 찾아주세요": "appointment",
        "2026-08-10 정년 도래 시점 근거를 찾아주세요": "retirement",
        "2026-08-10 당연퇴직 사유 근거를 찾아주세요": "retirement",
        "2026-08-10 교육경비 반납 근거를 찾아주세요": "training",
    }
    for question, topic in cases.items():
        result = classifier.classify(question)
        assert result.in_scope, question
        assert result.review_tier == "evidence_only", question
        assert result.topic == topic, question


def test_a_promotion_question_is_not_swallowed_by_the_training_topic() -> None:
    """`승진소요최저연수`는 `연수`를 품는다. 교육훈련 어휘에 `연수`를 넣으면 승진 질문이
    교육훈련으로 새고, 그 사실은 조문을 아무리 늘려도 화면에서만 드러난다."""
    result = QuestionClassifier().classify("2026-08-10 7급 승진소요최저연수 근거를 찾아주세요")

    assert result.topic == "performance_and_promotion"
