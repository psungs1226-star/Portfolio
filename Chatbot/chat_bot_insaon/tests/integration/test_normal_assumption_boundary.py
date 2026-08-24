import pytest

from insaon.api.reviews import InMemoryReviewSessionStore, ReviewApiService
from insaon.application.factory import build_offline_review_service
from insaon.application.review import ReviewCommand
from insaon.domain import AnswerStatus

NORMAL_ALLOWANCE_ASSUMPTIONS = (
    "prior_same_child_leave_months",
    "salary_on_payment_date",
    "disciplinary_action_in_period",
    "other_nonservice_periods",
    "annual_salary_exclusion_applies",
)


def review(question: str, request_id: str = "NORMAL-ASSUMPTION-BOUNDARY"):
    return build_offline_review_service().handle(
        ReviewCommand(request_id=request_id, question_text=question)
    )


def test_each_profile_assumes_only_its_own_registered_fields() -> None:
    """프로필은 lane마다 따로다. 한쪽 기본값이 다른 lane으로 흘러가면 안 된다.

    육아휴직 심층 검토에도 프로필이 생겼다(`parental-leave-normal-v1`). 같은 자녀의
    기존 육아휴직을 정근수당 lane에서는 이미 0으로 가정하면서 여기서는 매번 물었고,
    한쪽에서 통상값으로 두는 사실을 다른 쪽에서 필수로 요구할 이유가 없었다.
    """
    allowance = review(
        "2026년 상반기 육아휴직 복직자의 정근수당은 100%인가 50%인가?"
    )
    parental = review("2026-08-04 육아휴직 조건", "PARENTAL-PROFILE")

    assert allowance.assumed_conditions == NORMAL_ALLOWANCE_ASSUMPTIONS
    assert allowance.assumption_profile_id == "regular-service-allowance-normal-v1"

    assert parental.assumed_conditions == ("previous_leave_periods",)
    assert parental.assumption_profile_id == "parental-leave-normal-v1"
    # 자녀 생년월일은 기간 상한을 직접 정하므로 가정하지 않고 계속 묻는다.
    assert parental.missing_conditions == ("child_birth_date",)
    # 정근수당 프로필의 기본값이 휴직 lane으로 새지 않는다.
    assert not set(NORMAL_ALLOWANCE_ASSUMPTIONS) & set(parental.assumed_conditions)


def test_explicit_allowance_exception_takes_priority_over_normal_assumption() -> None:
    answer = review(
        "2026년 상반기 육아휴직 복직자의 정근수당을 확인해줘. "
        "7월 1일에는 재직 중이지만 봉급 미지급이야.",
        "EXPLICIT-EXCEPTION-PRIORITY",
    )

    assert "salary_on_payment_date" in answer.confirmed_conditions
    assert "salary_on_payment_date" not in answer.assumed_conditions
    assert set(answer.assumed_conditions) == set(NORMAL_ALLOWANCE_ASSUMPTIONS) - {
        "salary_on_payment_date"
    }


@pytest.mark.parametrize(
    ("question", "expected_missing", "expected_prompt"),
    (
        (
            "2026-08-04 질병휴직 조건",
            ("medical_leave_basis",),
            "질병휴직의 공무상·비공무상 구분",
        ),
        (
            "2026-08-04 가족돌봄휴직 조건",
            ("care_recipient_relation",),
            "돌봄 대상과의 관계",
        ),
        (
            "2026-08-04 자기개발휴직 조건",
            ("application_purpose",),
            "자기개발휴직 신청 목적",
        ),
    ),
)
def test_nonregistered_review_paths_ask_real_missing_values_without_assumptions(
    question: str,
    expected_missing: tuple[str, ...],
    expected_prompt: str,
) -> None:
    answer = review(question, f"NONREGISTERED-{len(question)}")

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.assumed_conditions == ()
    assert answer.assumption_profile_id is None
    assert answer.missing_conditions == expected_missing
    assert expected_prompt in answer.short_answer
    assert "normal_case_assumptions_applied" not in answer.review_reasons


@pytest.mark.parametrize(
    "question",
    (
        "지방공무원 전체 인사규정 근거를 찾아주세요",
        "질병휴직자의 정근수당 지급 기준을 찾아주세요",
        "징계 시효는 몇 년인가요?",
    ),
)
def test_the_wide_lane_assumes_today_and_says_so(question: str) -> None:
    """넓은 lane의 기준일은 등록된 통상 가정이다(ADR-0026).

    이 두 질문은 직전까지 이 파일의 "가정 없이 되묻는다" 목록에 있었다. 옮긴 이유는
    규칙이 바뀌었기 때문이며, 그 lane에서 빠진 것이 기준일 하나뿐이라 되묻기가 곧
    막다른 길이었다. 가정은 여전히 ADR-0016의 규칙을 따른다 — 화면에 표시되고,
    상태를 올리지 못하고, 세션에 확정값으로 남지 않는다.
    """
    answer = review(question, f"WIDE-TODAY-{len(question)}")

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.missing_conditions == ()
    assert answer.assumed_conditions == ("reference_date",)
    assert answer.assumption_profile_id == "reference-date-today-v1"
    assert "normal_case_assumptions_applied" in answer.review_reasons
    assert "reference_date" not in answer.confirmed_conditions


def test_an_explicit_reference_date_beats_the_today_assumption() -> None:
    answer = review("2026-08-04 징계 시효는 몇 년인가요?", "WIDE-EXPLICIT-DATE")

    assert answer.assumed_conditions == ()
    assert "reference_date" in answer.confirmed_conditions


def test_assumed_values_are_neither_confirmed_nor_persisted_in_session_state() -> None:
    store = InMemoryReviewSessionStore()
    service = ReviewApiService(build_offline_review_service(), store)

    session_id, answer = service.create(
        question_text=(
            "2026년 상반기 육아휴직 복직자의 정근수당은 100%인가 50%인가?"
        ),
        idempotency_key="ASSUMPTION-SESSION-BOUNDARY",
        local_rule_checked=False,
    )

    session_conditions = store.get(session_id).structured_conditions
    session_fields = {condition.field_name for condition in session_conditions}
    assert answer.assumed_conditions == NORMAL_ALLOWANCE_ASSUMPTIONS
    assert answer.assumption_profile_id == "regular-service-allowance-normal-v1"
    assert not set(answer.assumed_conditions) & set(answer.confirmed_conditions)
    assert not set(answer.assumed_conditions) & session_fields
    assert all(
        condition.provenance != "normal_case_assumption"
        for condition in session_conditions
    )


def test_out_of_scope_question_abstains_without_normal_assumptions() -> None:
    answer = review(
        "2026-08-04 국가공무원 육아휴직 조건을 최종 판단해 주세요",
        "OUT-OF-SCOPE-NO-ASSUMPTION",
    )

    assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert answer.assumed_conditions == ()
    assert answer.assumption_profile_id is None
    assert answer.missing_conditions == ()
    assert "unsupported_subject_or_topic" in answer.review_reasons


@pytest.mark.parametrize(
    ("initial_question", "followup", "expected_fields"),
    (
        (
            "2026-08-04 질병휴직 조건",
            "비공무상 질병휴직입니다.",
            {"medical_leave_basis"},
        ),
        (
            "2026-08-04 가족돌봄휴직 조건",
            "돌봄 대상은 부모입니다.",
            {"care_recipient_relation"},
        ),
        (
            "2026-08-04 자기개발휴직 조건",
            "자기개발 목적은 학위 취득입니다.",
            {"application_purpose"},
        ),
    ),
)
def test_supported_leave_followup_preserves_type_and_stores_real_core(
    initial_question: str,
    followup: str,
    expected_fields: set[str],
) -> None:
    store = InMemoryReviewSessionStore()
    service = ReviewApiService(build_offline_review_service(), store)
    session_id, first = service.create(
        question_text=initial_question,
        idempotency_key=f"GENERAL-CORE-FIRST-{len(initial_question)}",
        local_rule_checked=False,
    )
    _, second = service.message(
        session_id,
        question_text=followup,
        idempotency_key=f"GENERAL-CORE-SECOND-{len(initial_question)}",
        local_rule_checked=False,
    )

    session_fields = {
        item.field_name for item in store.get(session_id).structured_conditions
    }
    assert expected_fields <= set(first.missing_conditions)
    assert expected_fields <= session_fields
    assert not expected_fields & set(second.missing_conditions)
    assert second.assumed_conditions == ()


@pytest.mark.parametrize(
    "question",
    (
        "2026-08-04 신규임용 근거",
        "2026-08-04 인사기록 근거",
        "2026-08-04 승진 평정 근거",
        "2026-08-04 복무 규정 근거",
        "2026-08-04 보수 근거",
        "2026-08-04 징계 소청 근거",
        "2026-08-04 교육훈련 근거",
        "2026-08-04 명예퇴직 근거",
    ),
)
def test_wide_personnel_topics_do_not_inherit_leave_assumptions(question: str) -> None:
    answer = review(question, f"WIDE-DEFAULT-DENY-{len(question)}")

    assert answer.assumed_conditions == ()
    assert answer.assumption_profile_id is None


def test_dotted_leave_period_does_not_reask_period_or_derived_reinstatement_date() -> None:
    answer = review(
        "2025. 4. 1 ~ 2026. 3. 31까지 육아휴직한 복직자의 "
        "2026년 상반기 정근수당은 100%인가 50%인가?",
        "DOTTED-PERIOD-NO-REASK",
    )

    assert answer.missing_conditions == ()
    assert {"leave_periods", "reinstatement_date"} <= set(
        answer.confirmed_conditions
    )
    assert "이번 육아휴직 기간" not in answer.short_answer
    assert "복직일" not in answer.short_answer
