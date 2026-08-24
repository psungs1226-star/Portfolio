"""사용자가 이미 말한 사실을 라벨 단어가 없다는 이유로 되묻지 않는다.

복직일이 `복직자|복직한|…`에 걸려 있어서 "2025. 4. 1 ~ 2026. 3. 31 육아휴직자"라고 쓰면
종료일을 알면서도 되물었다. 그 하나만 고치고 끝낼 문제가 아니었다. 네 lane을 훑어보니
같은 방식으로 **11건 중 6건**이 이미 말한 사실을 되묻고 있었다.

원인은 전부 같다. 추출기가 `자녀 생년월일은`·`돌봄 대상은`·`목적은` 같은 **라벨 표기**를
요구하는데 사람은 `2025년 3월 2일생`·`어머니를 돌보려고`·`대학원 진학하려고`라고 쓴다.

넓히는 것은 표기이지 의미가 아니다. 값이 문장에 없으면 여전히 묻는다.
"""

import pytest

from insaon.application.factory import build_review_service
from insaon.application.session import ReviewConversation
from insaon.settings import Settings

SERVICE = build_review_service(Settings())


def missing(text: str) -> tuple[str, ...]:
    return ReviewConversation(SERVICE, request_id=text[:16]).ask(text).missing_conditions


@pytest.mark.parametrize(
    "text",
    [
        "2026년 8월 10일 기준 2025년 3월 2일생 자녀의 육아휴직 가능한가요?",
        "2026년 8월 10일 기준 자녀가 2025. 3. 2. 태어났는데 육아휴직 되나요?",
        "2026년 8월 10일 기준 2025-03-02 출생한 아이 육아휴직 되나요?",
    ],
)
def test_a_birth_date_is_read_however_the_sentence_words_it(text: str) -> None:
    assert "child_birth_date" not in missing(text)


@pytest.mark.parametrize(
    "text",
    [
        "2026년 8월 10일 기준 공무상 질병휴직 가능한가요?",
        "2026년 8월 10일 기준 업무상 재해로 인한 질병휴직 되나요?",
        "2026년 8월 10일 기준 공무 수행 중 다쳐서 질병휴직 신청합니다",
        "2026년 8월 10일 기준 비공무상 질병휴직 되나요?",
        "2026년 8월 10일 기준 개인 질병으로 질병휴직 되나요?",
    ],
)
def test_the_medical_basis_is_read_from_practitioner_wording(text: str) -> None:
    assert "medical_leave_basis" not in missing(text)


@pytest.mark.parametrize(
    "text",
    [
        "2026년 8월 10일 기준 부모 간병으로 가족돌봄휴직 되나요?",
        "2026년 8월 10일 기준 어머니를 돌보려고 가족돌봄휴직 신청합니다",
        "2026년 8월 10일 기준 배우자 간병 때문에 가족돌봄휴직 씁니다",
        "2026년 8월 10일 기준 돌봄 대상은 부모입니다. 가족돌봄휴직 되나요?",
    ],
)
def test_the_care_recipient_is_read_from_practitioner_wording(text: str) -> None:
    assert "care_recipient_relation" not in missing(text)


@pytest.mark.parametrize(
    "text",
    [
        "2026년 8월 10일 기준 학위 취득 목적 자기개발휴직 가능한가요?",
        "2026년 8월 10일 기준 대학원 진학하려고 자기개발휴직 쓰려는데요",
        "2026년 8월 10일 기준 연구과제 수행을 위해 자기개발휴직 신청합니다",
    ],
)
def test_the_self_development_purpose_is_read_from_practitioner_wording(
    text: str,
) -> None:
    assert "application_purpose" not in missing(text)


@pytest.mark.parametrize(
    ("text", "field"),
    [
        ("2026년 8월 10일 기준 육아휴직 가능한가요?", "child_birth_date"),
        ("2026년 8월 10일 기준 질병휴직 되나요?", "medical_leave_basis"),
        ("2026년 8월 10일 기준 가족돌봄휴직 되나요?", "care_recipient_relation"),
        ("2026년 8월 10일 기준 자기개발휴직 되나요?", "application_purpose"),
    ],
)
def test_a_fact_the_sentence_never_states_is_still_asked(text: str, field: str) -> None:
    """표기를 넓히는 것이지 없는 값을 지어내는 것이 아니다."""
    assert field in missing(text)
