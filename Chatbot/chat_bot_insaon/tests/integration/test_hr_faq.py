"""담당자가 실제로 묻는 FAQ 문장이 답으로 이어지는지 본다.

조문 제목으로 만든 질문은 순환 검증이다 — 어휘를 그 제목에서 뽑았으므로 당연히 맞는다.
여기 문항은 공무원 인사 FAQ에서 흔한 것을 사람이 쓰는 말로 적었고, **날짜를 붙이지
않는다.** 실제 사용자가 "질문 기준일"을 쓰지 않기 때문이다.

이 파일을 만들 때 그 지점에서 결함이 나왔다. 날짜 없는 FAQ 9건이 전부
`missing_conditions=('reference_date',)`로 끝났다. 라우팅도 검색도 멀쩡했는데 화면에는
아무것도 답하지 못하는 제품으로 보였다(ADR-0026).
"""

from __future__ import annotations

import pytest

from insaon.application.factory import build_review_service
from insaon.application.session import ReviewConversation
from insaon.settings import Settings

SERVICE = build_review_service(Settings())
PROVISIONS = SERVICE._evidence_retrieval._provisions if SERVICE._evidence_retrieval else {}

# (질문, 답이 실려야 할 조문 제목 조각). 날짜를 붙이지 않는다.
FAQ = [
    ("시보 임용기간은 얼마인가요?", "시보임용"),
    ("공무원 임용 결격사유가 뭔가요?", "결격사유"),
    ("인사기록카드 보존기간은 몇 년인가요?", "인사기록"),
    ("인사기록 열람은 누가 할 수 있나요?", "인사기록"),
    ("7급 승진소요최저연수 알려줘", "승진소요"),
    ("승진후보자명부는 어떻게 작성하나요?", "승진"),
    ("근무성적평정 시기가 언제인가요?", "근무성적"),
    ("배우자 출산휴가 며칠이에요?", "휴가"),
    ("봉급 지급일이 언제인가요?", "봉급"),
    ("가족수당 부양가족은 몇 명까지 인정되나요?", "수당"),
    ("시간외근무수당 상한이 몇 시간인가요?", "시간외근무수당"),
    ("징계 시효는 몇 년인가요?", "시효"),
    ("징계부가금은 어떤 경우에 부과하나요?", "징계부가금"),
    ("소청심사는 며칠 안에 청구해야 하나요?", "소청"),
    ("징계 종류에는 뭐가 있나요?", "종류"),
    ("교육훈련 이수 결과는 어디에 활용되나요?", "교육훈련"),
    ("교육경비 반납 사유가 뭔가요?", "반납"),
    ("공무원 정년퇴직 나이가 몇 세예요?", "정년"),
    ("명예퇴직 근속 요건이 뭐예요?", "명예퇴직"),
    ("퇴직급여 청구 절차가 어떻게 되나요?", "퇴직"),
]


@pytest.mark.parametrize(("question", "expected"), FAQ, ids=[q for q, _ in FAQ])
def test_a_dateless_faq_question_comes_back_with_the_provision_that_answers_it(
    question: str, expected: str
) -> None:
    answer = ReviewConversation(SERVICE, request_id=question[:16]).ask(
        question, local_rule_checked=True
    )

    assert answer.missing_conditions == (), f"{question} 에서 조건을 되물었다"
    titles = [
        PROVISIONS[citation.provision_id].title
        for citation in answer.citations
        if citation.provision_id in PROVISIONS
    ]
    assert any(expected in title for title in titles), (
        f"{question} → 기대 [{expected}] · 받은 것 {titles}"
    )


@pytest.mark.parametrize(("question", "_expected"), FAQ, ids=[q for q, _ in FAQ])
def test_a_dateless_faq_question_discloses_the_assumed_reference_date(
    question: str, _expected: str
) -> None:
    """날짜를 가정했으면 가정했다고 말해야 한다.

    묻지 않은 기준일로 답을 주면서 그 사실을 숨기면, 담당자는 자기가 확인해야 할
    시점을 모른 채 조문을 읽는다.
    """
    answer = ReviewConversation(SERVICE, request_id=question[:16]).ask(
        question, local_rule_checked=True
    )

    assert answer.assumed_conditions == ("reference_date",)
    assert answer.assumption_profile_id == "reference-date-today-v1"
    assert answer.status.value == "REVIEW_REQUIRED", "가정은 상태를 올리지 못한다"


@pytest.mark.parametrize(
    "opening",
    (
        "자녀가 2025년 3월 2일생인데 육아휴직 얼마나 쓸 수 있나요?",
        "공무상 질병으로 질병휴직 되나요?",
        "어머니 간병하려고 가족돌봄휴직 신청하려는데 가능한가요?",
        "대학원 진학하려고 자기개발휴직 쓸 수 있나요?",
    ),
    ids=["parental", "medical", "family_care", "self_development"],
)
def test_a_dateless_leave_faq_asks_once_then_reaches_evidence(opening: str) -> None:
    """심층 lane은 기준일을 가정하지 않는다 — 결론을 만드는 lane이기 때문이다.

    대신 막다른 길이 아니어야 한다. 한 번 되묻고, 사용자가 날짜를 주면 근거까지 간다.
    유형별 결정적 사실(공무상 구분·돌봄 관계·신청 목적)은 이 문장에 이미 있으므로
    다시 묻지 않아야 한다.
    """
    conversation = ReviewConversation(SERVICE, request_id=opening[:16])
    first = conversation.ask(opening, local_rule_checked=True)

    assert first.missing_conditions == ("reference_date",), (
        "기준일 외의 사실을 다시 물었다"
    )

    second = conversation.ask("2026년 8월 10일 기준입니다", local_rule_checked=True)

    assert second.missing_conditions == ()
    assert second.citations


def test_a_child_birth_date_is_not_used_as_the_question_reference_date() -> None:
    """`2025년 3월 2일생`이 질문 기준일이 되면 2025년 시점의 법령으로 판단한다.

    화면에는 되묻지도 않고 답이 뜨므로 사용자가 알아챌 방법이 없다. 생년월일을
    알아보는 정규식이 두 벌이었고 좁은 쪽이 기준일 추출에 쓰이면서 생긴 결함이다.
    """
    for question in (
        "자녀가 2025년 3월 2일생인데 육아휴직 얼마나 쓸 수 있나요?",
        "2025년 3월 2일생 자녀 육아휴직 되나요?",
        "자녀가 2025. 3. 2. 태어났습니다. 육아휴직 되나요?",
        "2025-03-02 출생아 육아휴직 가능한가요?",
    ):
        conversation = ReviewConversation(SERVICE, request_id=question[:16])
        conversation.ask(question, local_rule_checked=True)
        values = {item.field_name: item.value for item in conversation.conditions}

        assert values.get("child_birth_date") is not None, question
        assert values.get("reference_date") is None, (
            f"{question} 에서 생년월일이 질문 기준일로 새어 들어갔다"
        )


@pytest.mark.parametrize(
    "question",
    (
        "오늘 날씨 어때",
        "점심시간 몇 시부터야",
        "계약직 재계약 절차 알려줘",
        "겸직 허가 기준 알려줘",
    ),
)
def test_a_question_outside_the_corpus_is_still_refused(question: str) -> None:
    """기준일을 가정한다고 아무 질문에나 조문을 붙이면 안 된다."""
    answer = ReviewConversation(SERVICE, request_id=question[:16]).ask(question)

    assert not answer.citations
    assert "no_supported_topic_signal" in answer.review_reasons
