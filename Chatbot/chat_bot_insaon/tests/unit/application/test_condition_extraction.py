from datetime import date

import pytest

from insaon.application.classification import QuestionClassifier
from insaon.application.conditions import ConditionExtractor
from insaon.domain import ConditionState


def test_condition_extractor_tracks_value_state_and_provenance() -> None:
    text = "2024년 1월 1일 당시 공무상 질병휴직 규정을 찾아주세요"
    classification = QuestionClassifier().classify(text)
    conditions = ConditionExtractor().extract(text, classification)
    by_name = {condition.field_name: condition for condition in conditions}
    assert by_name["reference_date"].value.isoformat() == "2024-01-01"
    assert by_name["medical_leave_basis"].value == "public_duty"
    assert all(condition.provenance for condition in conditions)


def test_invalid_date_becomes_conflict() -> None:
    text = "2024-13-40 질병휴직"
    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    assert next(c for c in conditions if c.field_name == "reference_date").state is ConditionState.CONFLICT


def test_non_public_duty_is_not_misclassified_by_substring_match() -> None:
    text = "2024-01-01 비공무상 질병휴직 후 복직 가능한가요?"
    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["medical_leave_basis"].value == "non_public_duty"


def test_parental_followup_extracts_child_and_previous_leave_without_changing_date() -> None:
    classification = QuestionClassifier().classify("2026-08-04 육아휴직 조건")
    conditions = ConditionExtractor().extract(
        "자녀 출생일은 2022년 5월 1일이고 같은 자녀의 이전 육아휴직은 없습니다.",
        classification,
    )
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["child_birth_date"].value.isoformat() == "2022-05-01"
    assert by_name["previous_leave_periods"].value == ()
    assert by_name["reference_date"].state is ConditionState.UNKNOWN


def test_parental_complete_question_keeps_reference_date_separate_from_child_birth() -> None:
    text = (
        "2026-07-01 육아휴직 후 복직 근거를 찾아주세요. "
        "자녀 출생일은 2022-05-01이고 같은 자녀의 이전 육아휴직은 없습니다."
    )

    values = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {value.field_name: value for value in values}

    assert by_name["reference_date"].value == date(2026, 7, 1)
    assert by_name["child_birth_date"].value == date(2022, 5, 1)


def test_family_care_followup_extracts_relation() -> None:
    classification = QuestionClassifier().classify("2026-08-04 가족돌봄휴직 조건")
    conditions = ConditionExtractor().extract("돌봄 대상은 부모입니다.", classification)
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["care_recipient_relation"].value == "parent"


def test_self_development_followup_extracts_purpose() -> None:
    classification = QuestionClassifier().classify("2026-08-04 자기개발휴직 조건")
    conditions = ConditionExtractor().extract(
        "자기개발 목적은 학위 취득입니다.", classification
    )
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["application_purpose"].value == "학위 취득입니다"


def test_regular_service_allowance_extracts_payment_and_reinstatement_dates() -> None:
    text = (
        "2026년 4월 1일 육아휴직 복직자의 2026년 상반기 "
        "정근수당은 100%인가 50%인가?"
    )

    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["reference_date"].value.isoformat() == "2026-07-01"
    assert by_name["reinstatement_date"].value.isoformat() == "2026-04-01"
    assert by_name["allowance_period"].value == "first_half"


def test_regular_service_allowance_understands_natural_korean_date_phrases() -> None:
    text = (
        "2025년 5월 말부터 2026년 4월 1일자 육아휴직한 복직자의 "
        "2026년도 상반기 정근수당은 100%야 50%야?"
    )

    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["reference_date"].value.isoformat() == "2026-07-01"
    assert by_name["reinstatement_date"].value.isoformat() == "2026-04-01"
    assert by_name["allowance_period"].value == "first_half"
    assert by_name["leave_periods"].value[0].start.isoformat() == "2025-05-31"
    assert by_name["leave_periods"].value[0].end.isoformat() == "2026-04-01"


@pytest.mark.parametrize(
    "period_text",
    (
        "2025. 4. 1 ~ 2026. 3. 31까지",
        "2025.4.1~2026.3.31까지",
        "2025. 4. 1부터 2026. 3. 31까지",
        "2025.4.1부터~2026.3.31까지",
    ),
)
def test_regular_allowance_parses_dotted_inclusive_leave_period_and_reinstatement(
    period_text: str,
) -> None:
    text = (
        f"{period_text} 육아휴직한 복직자의 "
        "2026년 상반기 정근수당은 100%인가 50%인가?"
    )

    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    leave_periods = by_name.get("leave_periods")
    assert leave_periods is not None
    assert leave_periods.state is ConditionState.CONFIRMED
    assert leave_periods.value[0].start.isoformat() == "2025-04-01"
    assert leave_periods.value[0].end.isoformat() == "2026-04-01"
    assert by_name["reinstatement_date"].state is ConditionState.CONFIRMED
    assert by_name["reinstatement_date"].value.isoformat() == "2026-04-01"
    assert by_name["reinstatement_date"].provenance == "derived_leave_period_end"


def test_regular_allowance_does_not_derive_reinstatement_without_completed_return() -> None:
    text = (
        "2025. 4. 1 ~ 2026. 3. 31까지 육아휴직 기간의 "
        "2026년 상반기 정근수당을 검토해줘"
    )

    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["leave_periods"].state is ConditionState.CONFIRMED
    assert by_name["reinstatement_date"].state is ConditionState.UNKNOWN


def test_regular_allowance_does_not_guess_current_period_from_multiple_ranges() -> None:
    text = (
        "2024. 1. 1 ~ 2024. 3. 31과 2025. 4. 1 ~ 2026. 3. 31까지 "
        "육아휴직한 복직자의 2026년 상반기 정근수당을 검토해줘"
    )

    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    assert "leave_periods" not in by_name
    assert by_name["reinstatement_date"].state is ConditionState.UNKNOWN


def test_explicit_reinstatement_wins_when_it_matches_dotted_period_end() -> None:
    text = (
        "2025. 4. 1 ~ 2026. 3. 31까지 육아휴직 후 "
        "2026. 4. 1 복직자의 2026년 상반기 정근수당을 검토해줘"
    )

    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["reinstatement_date"].state is ConditionState.CONFIRMED
    assert by_name["reinstatement_date"].value.isoformat() == "2026-04-01"
    assert by_name["reinstatement_date"].provenance == "question_text"


def test_conflicting_explicit_reinstatement_and_period_end_stays_unresolved() -> None:
    text = (
        "2025. 4. 1 ~ 2026. 3. 31까지 육아휴직 후 "
        "2026. 4. 2 복직자의 2026년 상반기 정근수당을 검토해줘"
    )

    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["reinstatement_date"].state is ConditionState.CONFLICT


def test_invalid_dotted_period_fails_safe_without_derived_reinstatement() -> None:
    text = (
        "2025. 13. 1 ~ 2026. 3. 31까지 육아휴직한 복직자의 "
        "2026년 상반기 정근수당을 검토해줘"
    )

    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    by_name = {condition.field_name: condition for condition in conditions}

    assert "leave_periods" not in by_name
    assert by_name["reinstatement_date"].state is ConditionState.UNKNOWN


def test_regular_service_allowance_extracts_followup_facts() -> None:
    text = (
        "육아휴직은 2026년 1월 1일부터 2026년 3월 31일까지고, "
        "같은 자녀 기존 육아휴직은 0개월이야. 7월 1일 재직 중이고 봉급 지급돼. "
        "징계와 직위해제 같은 제외기간 없고 연봉제 대상 아니야."
    )

    conditions = ConditionExtractor().extract(
        text,
        QuestionClassifier().classify(
            "2026년 상반기 육아휴직 복직자 정근수당 지급률"
        ),
    )
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["leave_periods"].value[0].start.isoformat() == "2026-01-01"
    assert by_name["leave_periods"].value[0].end.isoformat() == "2026-04-01"
    assert by_name["prior_same_child_leave_months"].value == 0
    assert by_name["salary_on_payment_date"].value is True
    assert by_name["disciplinary_action_in_period"].value is False
    assert by_name["other_nonservice_periods"].value == ()
    assert by_name["annual_salary_exclusion_applies"].value is False


def test_regular_allowance_followup_period_does_not_replace_reference_date() -> None:
    text = "육아휴직은 2026-01-01 ~ 2026-03-31이고 2026-04-01 복직했어요."

    conditions = ConditionExtractor().extract(
        text,
        QuestionClassifier().classify("2026년 상반기 육아휴직 복직자 정근수당"),
    )
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["reference_date"].state is ConditionState.UNKNOWN
    assert by_name["leave_periods"].value[0].start == date(2026, 1, 1)


def test_regular_allowance_extracts_completed_grouped_answer_template() -> None:
    text = (
        "같은 자녀의 기존 육아휴직: 0개월\n"
        "7월 1일 재직 및 봉급 지급: 예\n"
        "징계·직위해제 등 지급 제외기간: 없음\n"
        "연봉제 별도 미지급 대상: 아니오"
    )

    conditions = ConditionExtractor().extract(
        text,
        QuestionClassifier().classify(
            "2026년도 상반기 육아휴직 복직자 정근수당 지급률"
        ),
    )
    by_name = {condition.field_name: condition for condition in conditions}

    assert by_name["prior_same_child_leave_months"].value == 0
    assert by_name["salary_on_payment_date"].value is True
    assert by_name["disciplinary_action_in_period"].value is False
    assert by_name["other_nonservice_periods"].value == ()
    assert by_name["annual_salary_exclusion_applies"].value is False


def test_regular_allowance_does_not_accept_unedited_answer_template_choices() -> None:
    text = (
        "같은 자녀의 기존 육아휴직: __개월\n"
        "7월 1일 재직 및 봉급 지급: 예 / 아니오\n"
        "징계·직위해제 등 지급 제외기간: 있음 / 없음\n"
        "연봉제 별도 미지급 대상: 예 / 아니오"
    )

    conditions = ConditionExtractor().extract(
        text,
        QuestionClassifier().classify(
            "2026년도 상반기 육아휴직 복직자 정근수당 지급률"
        ),
    )
    names = {condition.field_name for condition in conditions}

    assert "prior_same_child_leave_months" not in names
    assert "salary_on_payment_date" not in names
    assert "disciplinary_action_in_period" not in names
    assert "other_nonservice_periods" not in names
    assert "annual_salary_exclusion_applies" not in names


@pytest.mark.parametrize(
    "text",
    [
        "2026-03-02기준으로 육아휴직 조건",
        "육아휴직 기준일 2026-03-02입니다",
        "육아휴직 기준일은 2026-03-02이고 조건을 알려주세요",
        "2026-03-02부터 육아휴직 조건",
        "2026-03-02당시에 적용되던 육아휴직 조건",
        "육아휴직 기준일2026-03-02 조건",
    ],
)
def test_iso_reference_date_survives_attached_korean_particles(text: str) -> None:
    """한글은 파이썬 정규식에서 \\w다.

    ISO 날짜 앞뒤에 조사가 공백 없이 붙으면 `\\b` 경계가 성립하지 않아 기준일을
    통째로 놓쳤다. 사용자가 가장 흔하게 쓰는 표기라 재질문 루프로 이어졌다.
    """
    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    reference_date = next(c for c in conditions if c.field_name == "reference_date")

    assert reference_date.state is ConditionState.CONFIRMED
    assert reference_date.value == date(2026, 3, 2)


def test_iso_date_still_rejects_a_longer_digit_run() -> None:
    """경계를 풀어도 숫자가 이어 붙은 값은 날짜로 읽지 않는다."""
    text = "육아휴직 문서번호 2026-03-021 조건"
    conditions = ConditionExtractor().extract(text, QuestionClassifier().classify(text))
    reference_date = next(c for c in conditions if c.field_name == "reference_date")

    assert reference_date.state is ConditionState.UNKNOWN
