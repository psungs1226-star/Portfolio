"""색인된 조문은 그 조문의 말로 물었을 때 닿아야 한다.

이 파일이 있는 이유는 화면 하나 때문이다. `인사의 가점을 받을 수 있는 법적인 근거들
모아봐`가 "인사ON은 휴직·복직 질문만 지원해요"로 끝났다. 두 가지가 틀렸다 — 여덟 개
인사 주제가 색인돼 있으므로 그 문장은 거짓이었고, 범위 판정이 손으로 적은 단어 목록이라
목록에 없는 말은 저장소에 조문이 있든 없든 똑같이 거절됐다.

어휘를 corpus에서 뽑도록 바꿨다(ADR-0025). 그러면 새 조문이 들어올 때 아무도 단어를
추가하지 않아도 닿는다. 이 테스트는 그 성질이 유지되는지 본다. 여기가 깨지면 조문을
넣고도 아무도 찾지 못하는 상태로 되돌아간 것이다.
"""

from __future__ import annotations

from datetime import date

import pytest

from insaon.application.factory import build_review_service
from insaon.application.session import ReviewConversation
from insaon.settings import Settings

SERVICE = build_review_service(Settings())
REFERENCE_DATE = date(2026, 8, 10)

# 일부러 닿으면 안 되는 조문들. 구버전·미시행은 시점 필터가, 단서·부칙·인접 혼동은
# 제목이 주제어가 아니라는 사실이 걸러야 한다. 분모에 넣으면 정상 동작을 결함으로 센다.
_UNREACHABLE_BY_DESIGN = ("구버전", "개정 예정", "다른 직군", "단서", "부칙", "구분")

# 제목에서 3자 이상 토큰이 나오지 않아 씨앗 어휘로만 닿는 조문. `기록 정정`은
# `기록`(2자) `정정`(2자)뿐이고, 두 글자 일반어를 어휘에 넣으면 `계약직 재계약 절차`가
# 퇴직으로 새므로 넣지 않았다. 고치지 않고 measured limitation으로 남긴다.
_KNOWN_UNREACHED = frozenset({"기록 정정"})


def _wide_body_provisions() -> list[tuple[str, str]]:
    retrieval = SERVICE._evidence_retrieval
    topic_source_ids = SERVICE._evidence_topic_source_ids
    if retrieval is None or not topic_source_ids:
        pytest.skip("넓은 lane corpus가 연결되지 않았다")
    wide_sources = {
        source_id for source_ids in topic_source_ids.values() for source_id in source_ids
    }
    return [
        (provision.provision_id, provision.title.replace("[합성] ", "").split(" · ")[-1])
        for provision in retrieval._provisions.values()
        if provision.source_id in wide_sources
        and not any(
            marker in provision.title or marker in provision.article_path
            for marker in _UNREACHABLE_BY_DESIGN
        )
        and provision.is_effective_on(REFERENCE_DATE, "local_general_service")
    ]


WIDE_BODY = _wide_body_provisions()


@pytest.mark.parametrize(
    ("provision_id", "label"), WIDE_BODY, ids=[label for _, label in WIDE_BODY]
)
def test_an_indexed_provision_is_reachable_by_its_own_words(
    provision_id: str, label: str
) -> None:
    answer = ReviewConversation(SERVICE, request_id=provision_id[:16]).ask(
        f"2026년 8월 10일 기준 {label} 근거 조문 알려주세요"
    )

    if label in _KNOWN_UNREACHED:
        pytest.xfail(f"{label}: 제목에 3자 이상 주제어가 없다")

    assert "no_supported_topic_signal" not in answer.review_reasons, (
        f"{label} 조문은 색인돼 있는데 범위 밖으로 거절됐다"
    )
    assert provision_id in [citation.provision_id for citation in answer.citations], (
        f"{label} 질문이 자기 조문을 인용하지 못했다"
    )


@pytest.mark.parametrize(
    "question",
    [
        "오늘 날씨 어때",
        "점심시간은 몇 시부터인가요?",
        "우리 팀 워크숍 예산은 어디서 확인하죠?",
        "계약직 재계약 절차 알려줘",
        "2026년 8월 10일 기준 겸직 허가 기준",
        "인사의 가점을 받을 수 있는 법적인 근거들 모아봐",
    ],
)
def test_a_question_the_corpus_does_not_cover_does_not_get_answered_anyway(
    question: str,
) -> None:
    """어휘를 넓힌 대가로 아무 질문에나 인사 조문을 붙이면 더 나쁘다.

    `절차`·`요건` 같은 두 글자 일반 명사를 corpus에서 뽑아 넣었을 때 실제로
    `계약직 재계약 절차`가 퇴직 조문을 받았다. 그래서 생성 어휘는 3자 이상만 쓴다.
    """
    answer = ReviewConversation(SERVICE, request_id=question[:16]).ask(question)

    assert not answer.citations, f"{question} 에 근거를 붙였다"
    assert "no_supported_topic_signal" in answer.review_reasons


def test_the_refusal_does_not_understate_what_the_product_covers() -> None:
    answer = ReviewConversation(SERVICE, request_id="scope-copy").ask(
        "인사의 가점을 받을 수 있는 법적인 근거들 모아봐"
    )

    assert "휴직·복직 질문만" not in answer.short_answer
    assert any("근거 조문을 찾아 드려요" in item for item in answer.limitations)
