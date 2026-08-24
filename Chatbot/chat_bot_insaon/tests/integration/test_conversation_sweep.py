"""실무자가 칠 법한 문장을 넓게 던져 결함을 상시 감시한다.

이 파일이 있는 이유는 이 세션의 작업 방식 때문이다. 사용자가 화면에서 결함을 하나
집어주면 그것을 고치고, 다시 집어주면 또 고쳤다. 복직일 되묻기를 고친 뒤 전 lane을
훑어보니 같은 유형이 11건 중 6건이었다. 한 건씩 지적받아 고칠 문제가 아니었다.

여기서 재는 것은 회수율이 아니라 **대화가 막히지 않는가**다.

  A. 이미 문장에 있는 사실을 되묻지 않는다
  B. 근거를 찾고도 빈 답으로 끝나지 않는다
  C. 지원 주제 질문이 근거 0건으로 끝나지 않는다
  D. 다회차에서 앞 턴 사실을 잃지 않는다
  E. 생략형 후속이 앞 턴의 과업을 잇는다 (ADR-0024)
  F. 생략형 후속이 **묻지 않은 유형의 조문으로 답하지 않는다** (ADR-0024)

F가 가장 중요하다. A~E는 막히는 실패이고 화면에서 보이지만, F는 `ANSWERABLE`과 인용
다섯 줄이 뜨는 실패다. 조문 번호를 직접 대조하지 않으면 모른다. 실제로 이 스윕이 그렇게
찾았다 — `가족돌봄은요?`가 육아휴직 조문으로 답하고 있었다.

케이스는 잠금 평가셋이 아니다. 여기 수치를 성능으로 발표하지 않는다. 사용자가 화면에서
먼저 발견하는 일을 막는 것이 목적이다.
"""

from __future__ import annotations

import pytest

from insaon.application.factory import build_review_service
from insaon.application.session import ReviewConversation
from insaon.settings import Settings

SERVICE = build_review_service(Settings())


def _skip_if_private_corpus_missing(answer) -> None:  # type: ignore[no-untyped-def]
    """정근수당 lane은 비공개 공식 corpus를 요구한다.

    공개 트리에는 그 자료가 없으므로 `derived_pay_corpus_unavailable`로 끝난다. 그것은
    이 스윕이 잡으려는 결함이 아니라 의도된 공개 경계다. 파일을 통째로 빼는 대신 이
    경우만 건너뛰어 나머지 검사는 공개 트리에서도 돌게 둔다.
    """
    if "derived_pay_corpus_unavailable" in answer.review_reasons:
        pytest.skip("정근수당 공식 corpus는 공개 제출물 밖이다")

# (문장, 문장에 이미 들어 있는 값 → 되물으면 결함)
STATED: list[tuple[str, str]] = []
for date_form in ("2026년 8월 10일 기준", "2026-08-10 기준", "2026. 8. 10. 기준"):
    STATED += [
        (f"{date_form} 2025년 3월 2일생 자녀 육아휴직 되나요?", "child_birth_date"),
        (f"{date_form} 자녀가 2025. 3. 2. 태어났습니다. 육아휴직 되나요?", "child_birth_date"),
        (f"{date_form} 2025-03-02 출생아 육아휴직 가능한가요?", "child_birth_date"),
        (f"{date_form} 공무상 질병휴직 되나요?", "medical_leave_basis"),
        (f"{date_form} 업무상 재해 질병휴직 되나요?", "medical_leave_basis"),
        (f"{date_form} 공무 수행 중 부상으로 질병휴직 신청합니다", "medical_leave_basis"),
        (f"{date_form} 비공무상 질병휴직 되나요?", "medical_leave_basis"),
        (f"{date_form} 개인 질병으로 질병휴직 되나요?", "medical_leave_basis"),
        (f"{date_form} 부모 간병 가족돌봄휴직 되나요?", "care_recipient_relation"),
        (f"{date_form} 어머니를 돌보려고 가족돌봄휴직 씁니다", "care_recipient_relation"),
        (f"{date_form} 아버지 간병으로 가족돌봄휴직 신청", "care_recipient_relation"),
        (f"{date_form} 배우자 간병 가족돌봄휴직 되나요?", "care_recipient_relation"),
        (f"{date_form} 자녀 돌봄으로 가족돌봄휴직 되나요?", "care_recipient_relation"),
        (f"{date_form} 조부모 간병 가족돌봄휴직 되나요?", "care_recipient_relation"),
        (f"{date_form} 학위 취득 목적 자기개발휴직 되나요?", "application_purpose"),
        (f"{date_form} 대학원 진학하려고 자기개발휴직 씁니다", "application_purpose"),
        (f"{date_form} 연구과제 수행을 위해 자기개발휴직 신청", "application_purpose"),
        (f"{date_form} 어학연수를 하러 자기개발휴직 되나요?", "application_purpose"),
    ]
STATED += [
    ("2025-04-01 ~ 2026-03-31 육아휴직자의 2026년 상반기 정근수당은?", "reinstatement_date"),
    ("2025. 4. 1 ~ 2026. 3. 31 육아휴직자의 2026년 상반기 정근수당은?", "reinstatement_date"),
    ("2025년 4월 1일부터 2026년 3월 31일까지 육아휴직한 사람의 2026년 상반기 정근수당은?", "reinstatement_date"),
    ("2025.4.1~2026.3.31 육아휴직 후 2026년 상반기 정근수당 지급률은?", "reinstatement_date"),
]

WIDE = [
    ("2026년 8월 10일 기준 시보 임용기간 근거", "appointment"),
    ("2026년 8월 10일 기준 임용 결격사유 알려주세요", "appointment"),
    ("2026년 8월 10일 기준 인사기록카드 보존기간은?", "personnel_records"),
    ("2026년 8월 10일 기준 7급 승진소요최저연수는?", "performance_and_promotion"),
    ("2026년 8월 10일 기준 감봉 받으면 승진제한 기간은?", "performance_and_promotion"),
    ("2026년 8월 10일 기준 배우자 출산휴가 며칠인가요?", "service_and_leave"),
    ("2026년 8월 10일 기준 병가 며칠까지 쓸 수 있나요?", "service_and_leave"),
    ("2026년 8월 10일 기준 예비군 훈련 공가 되나요?", "service_and_leave"),
    ("2026년 8월 10일 기준 가족수당 부양가족 몇 명까지?", "pay_and_allowance"),
    ("2026년 8월 10일 기준 시간외근무수당 상한은?", "pay_and_allowance"),
    ("2026년 8월 10일 기준 징계 시효 몇 년인가요?", "discipline_and_appeal"),
    ("2026년 8월 10일 기준 직위해제 사유는?", "discipline_and_appeal"),
    ("2026년 8월 10일 기준 소청 며칠 안에 청구하나요?", "discipline_and_appeal"),
    ("2026년 8월 10일 기준 교육훈련 연간 몇 시간 이수?", "training"),
    ("2026년 8월 10일 기준 위탁교육 의무복무 기간은?", "training"),
    ("2026년 8월 10일 기준 공무원 정년 몇 세인가요?", "retirement"),
    ("2026년 8월 10일 기준 명예퇴직 근속 요건은?", "retirement"),
]

MULTI = [
    (["육아휴직 얼마나 쓸 수 있어요?", "2026년 8월 10일 기준이요", "자녀는 2025년 3월 2일생입니다"], "child_birth_date"),
    (["질병휴직 되나요?", "2026년 8월 10일 기준입니다", "공무상 질병입니다"], "medical_leave_basis"),
    (["가족돌봄휴직 문의드립니다", "2026-08-10 기준이요", "어머니를 돌봅니다"], "care_recipient_relation"),
    (["자기개발휴직 되나요?", "2026-08-10 기준", "대학원 진학하려고요"], "application_purpose"),
]

# 생략형 후속. 유형 4종 × 전환 대상 3종 × 표기 2종(전체/줄임말) × 어미 4종 = 96조합.
# 인용 provision_id에 유형 토큰이 들어 있어 어느 유형의 조문인지로 채점할 수 있다.
LEAVE_TOKENS = {
    "육아휴직": ("PARENTAL",),
    "질병휴직": ("MEDICAL",),
    "가족돌봄휴직": ("FAMILY",),
    "자기개발휴직": ("DEVELOP", "SELF_DEVELOPMENT"),
}
SHORT_FORMS = {
    "육아휴직": "육아",
    "질병휴직": "질병",
    "가족돌봄휴직": "가족돌봄",
    "자기개발휴직": "자기개발",
}
ELLIPTICAL_TAILS = ("{}는요?", "{}은요?", "그럼 {}은?", "{}도요?")

ELLIPTICAL = [
    (asked, switched, tail.format(form[switched]))
    for asked in LEAVE_TOKENS
    for switched in LEAVE_TOKENS
    if switched != asked
    for form in ({name: name for name in LEAVE_TOKENS}, SHORT_FORMS)
    for tail in ELLIPTICAL_TAILS
]



@pytest.mark.parametrize(("text", "field"), STATED, ids=range(len(STATED)))
def test_a_fact_the_sentence_already_states_is_not_asked_again(
    text: str, field: str
) -> None:
    answer = ReviewConversation(SERVICE, request_id=text[:16]).ask(text)
    _skip_if_private_corpus_missing(answer)

    assert field not in answer.missing_conditions
    assert not (
        answer.status.value == "INSUFFICIENT_EVIDENCE" and not answer.citations
    ), "근거를 찾고도 빈 답으로 끝났다"


@pytest.mark.parametrize(("text", "topic"), WIDE, ids=range(len(WIDE)))
def test_a_supported_wide_topic_question_comes_back_with_evidence(
    text: str, topic: str
) -> None:
    answer = ReviewConversation(SERVICE, request_id=text[:16]).ask(text)

    assert answer.citations, f"{topic} 질문이 근거 0건으로 끝났다"


@pytest.mark.parametrize(("turns", "field"), MULTI, ids=range(len(MULTI)))
def test_a_fact_supplied_in_an_earlier_turn_is_not_asked_again(
    turns: list[str], field: str
) -> None:
    conversation = ReviewConversation(SERVICE, request_id=turns[0][:16])
    answer = None
    for turn in turns:
        answer = conversation.ask(turn, local_rule_checked=True)

    assert answer is not None
    _skip_if_private_corpus_missing(answer)
    assert field not in answer.missing_conditions
    assert not (
        answer.status.value == "INSUFFICIENT_EVIDENCE" and not answer.citations
    )


@pytest.mark.parametrize(
    ("asked", "switched", "followup"), ELLIPTICAL, ids=range(len(ELLIPTICAL))
)
def test_an_elliptical_followup_keeps_the_task_and_switches_the_subject(
    asked: str, switched: str, followup: str
) -> None:
    conversation = ReviewConversation(SERVICE, request_id=f"{asked}{switched}{followup}")
    conversation.ask(
        f"2026-01-02 기준 {asked} 근거 조문 찾아주세요", local_rule_checked=True
    )
    answer = conversation.ask(followup, local_rule_checked=True)

    cited = [citation.provision_id for citation in answer.citations]
    stale = [
        provision_id
        for provision_id in cited
        if any(token in provision_id for token in LEAVE_TOKENS[asked])
    ]
    wanted = [
        provision_id
        for provision_id in cited
        if any(token in provision_id for token in LEAVE_TOKENS[switched])
    ]

    assert not stale, f"{followup} 인데 {asked} 조문을 인용했다: {stale}"
    assert wanted, f"{followup} 인데 {switched} 조문이 인용에 없다: {cited}"


def test_an_elliptical_followup_naming_two_types_asks_instead_of_guessing() -> None:
    """유형을 둘 부르면 앞 턴의 확정 유형이 되살아나면 안 된다.

    되살아나면 묻지 않은 유형의 조문으로 `ANSWERABLE`을 낸다. 되묻는 쪽이 옳다.
    """
    for followup in ("질병이랑 가족돌봄은요?", "질병휴직이랑 가족돌봄휴직은요?"):
        conversation = ReviewConversation(SERVICE, request_id=followup)
        conversation.ask(
            "2026-01-02 기준 육아휴직 근거 조문 찾아주세요", local_rule_checked=True
        )
        answer = conversation.ask(followup, local_rule_checked=True)

        assert answer.missing_conditions == ("leave_type",)
        assert not answer.citations


def test_an_elliptical_followup_does_not_open_the_condition_gate() -> None:
    """이월하는 것은 과업뿐이다. 필수 조건은 그대로 묻는다."""
    conversation = ReviewConversation(SERVICE, request_id="gate-kept")
    conversation.ask("2026-01-02 기준 육아휴직 되나요?", local_rule_checked=True)
    answer = conversation.ask("질병휴직은요?", local_rule_checked=True)

    assert answer.missing_conditions == ("medical_leave_basis",)
