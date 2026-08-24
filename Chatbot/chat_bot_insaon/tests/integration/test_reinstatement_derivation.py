"""휴직 종료일을 알면 복직일을 되묻지 않는다.

화면에서 이렇게 끝났다.

    나> 2025. 4. 1 ~ 2026. 3. 31 육아휴직자의 2026년 상반기 정근수당은?
    봇> 지급률을 확인하려면 아래 1가지만 더 알려주세요.  [복직일]

휴직이 2026. 3. 31에 끝난다는 것을 방금 입력받았고 `leave_periods`는 확정으로 잡혀
있었다. 그런데 복직일 파생이 `복직자|복직한|복직했|…` 정규식에 걸려 있어서, 같은 사실을
"복직자"라고 쓰면 파생되고 "육아휴직자"라고 쓰면 되물었다. 계산되는 값을 어휘 때문에
묻는 것이다.

파생값은 확정 사실이 아니라 통상 가정으로 둔다. 휴직이 끝났다고 반드시 복직한 것은
아니다 — 연장했거나 다른 휴직으로 이어졌거나 퇴직했을 수 있다. 그래서 `가정`으로 표시하고
상태 상한을 걸고 명시값이 들어오면 물러난다(ADR-0016).
"""

from datetime import date

import pytest

from insaon.application.factory import build_review_service
from insaon.application.session import ReviewConversation
from insaon.domain import AnswerStatus
from insaon.settings import Settings

QUESTION = "2025. 4. 1 ~ 2026. 3. 31 육아휴직자의 2026년 상반기 정근수당은?"


def _ask(text: str, request_id: str):  # type: ignore[no-untyped-def]
    """공개 데모가 실제로 쓰는 경로로 묻는다(`build_review_service`).

    `build_offline_review_service()`만으로는 정근수당 lane의 근거가 없어
    `derived_pay_corpus_unavailable`에서 멈추고, 그러면 이 테스트가 재려는 지점까지
    도달하지 못한다. 사용자가 화면에서 겪은 것은 데모 경로다.
    """
    service = build_review_service(Settings())
    return ReviewConversation(service, request_id=request_id).ask(text)


def test_a_finished_leave_period_supplies_the_reinstatement_date() -> None:
    answer = _ask(QUESTION, "DERIVE-REINSTATEMENT")

    assert "reinstatement_date" not in answer.missing_conditions
    assert "reinstatement_date" in answer.assumed_conditions


def test_the_derived_date_is_disclosed_as_an_assumption_not_as_a_confirmed_fact() -> None:
    answer = _ask(QUESTION, "DERIVE-DISCLOSED")
    if "derived_pay_corpus_unavailable" in answer.review_reasons:
        pytest.skip("정근수당 공식 corpus는 공개 제출물 밖이다")

    assert "reinstatement_date" not in answer.confirmed_conditions
    assert answer.status is not AnswerStatus.ANSWERABLE
    assert "normal_case_assumptions_applied" in answer.review_reasons


def test_an_explicit_reinstatement_word_still_confirms_rather_than_assumes() -> None:
    answer = _ask(
        "2025. 4. 1 ~ 2026. 3. 31까지 육아휴직한 복직자의 "
        "2026년 상반기 정근수당은 100%인가 50%인가?",
        "EXPLICIT-REINSTATEMENT",
    )

    assert "reinstatement_date" in answer.confirmed_conditions
    assert "reinstatement_date" not in answer.assumed_conditions


def test_an_open_ended_leave_still_asks_because_nothing_can_be_derived() -> None:
    """종료일이 없으면 계산할 것이 없다. 그때는 묻는 것이 맞다."""
    answer = _ask(
        "2025년 4월 1일부터 육아휴직 중인 사람의 2026년 상반기 정근수당은?",
        "OPEN-ENDED-LEAVE",
    )

    assert "reinstatement_date" in answer.missing_conditions
    assert "reinstatement_date" not in answer.assumed_conditions
    assert date(2026, 1, 1)
