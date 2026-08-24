"""공식 원문에는 검색 대상이 될 수 없는 노드가 섞여 있다.

법령을 조·항·호·목으로 쪼개면 조 노드는 본문이 `제33조` 다섯 글자뿐인 껍데기가 되고,
개정으로 지워진 호는 `삭제 <2013. 11. 20.>` 한 줄만 남는다. 둘 다 어떤 질문의 답도
될 수 없는데 검색 색인에는 다른 조문과 같은 자격으로 들어가 있었다.

여덟 주제 21개 질의를 재보니 top-5 자리의 **35.2%**를 이 노드들이 차지했다. 승진 질문
하나의 문제가 아니라 전 주제에서 상위 다섯 자리 중 둘이 빈 칸이었다는 뜻이다.

corpus에서 빼지는 않는다. `article_path` 복원과 부모·관계 추적이 이 노드를 거친다.
빼는 것은 **검색 후보 자격**뿐이다.
"""

from datetime import date

import pytest

from insaon.adapters.retrieval import searchable_provisions
from insaon.domain import DateRange, Provision


def _provision(provision_id: str, article_path: str, text: str) -> Provision:
    return Provision(
        provision_id=provision_id,
        source_id="SRC",
        article_path=article_path,
        title="승진소요 최저연수",
        text=text,
        valid_time=DateRange(date(2026, 1, 1)),
        applies_to=frozenset({"local_general_service"}),
        topic_tags=frozenset({"performance_and_promotion"}),
        source_hash="a" * 64,
    )


def test_a_header_node_whose_only_text_is_its_own_article_number_is_not_searchable() -> None:
    assert searchable_provisions((_provision("P1", "제33조", "제33조"),)) == ()


def test_a_deleted_provision_tombstone_is_not_searchable() -> None:
    assert searchable_provisions((_provision("P2", "제33조 제4항", "삭제 <2013. 11. 20.>"),)) == ()


@pytest.mark.parametrize(
    "text",
    [
        "7급, 8급 및 9급: 1년 이상",
        "6급: 2년 이상",
        "9급: 1년 6개월 이상",
    ],
)
def test_a_short_item_that_carries_the_answer_stays_searchable(text: str) -> None:
    """길이로 자르지 않는다. 승진소요최저연수를 정하는 호는 열 글자 안팎이고 그것이 답이다."""
    provision = _provision("P3", "제33조 제1항 제4호", text)

    assert searchable_provisions((provision,)) == (provision,)


def test_the_original_order_is_preserved() -> None:
    keep_first = _provision("P4", "제1조", "이 영은 지방공무원의 임용에 관하여 규정한다.")
    drop = _provision("P5", "제2조", "제2조")
    keep_last = _provision("P6", "제3조", "임용권자는 결원을 보충하여야 한다.")

    assert searchable_provisions((keep_first, drop, keep_last)) == (keep_first, keep_last)


def test_context_expansion_does_not_pull_an_empty_parent_into_the_citations() -> None:
    """색인에서 빼도 문맥 확장이 부모로 다시 끌어온다.

    `제43조 제4항`이 회수되면 확장이 부모 `제43조`를 따라가는데, 그 부모의 본문은
    `제43조` 세 글자다. 인용 목록의 한 자리가 빈 칸으로 채워진다. 확장이 가져올 값이
    있는 것은 부칙·단서처럼 본문을 가진 관계 조문이지 구조용 헤더가 아니다.
    """
    from insaon.adapters.retrieval import (
        CharNgramLexicalRetriever,
        InMemoryVectorRetriever,
        RetrievalPipeline,
    )

    parent = _provision("PARENT", "제43조", "제43조")
    child = Provision(
        provision_id="CHILD",
        source_id="SRC",
        article_path="제43조 제4항",
        title="승진소요최저연수",
        text="시간선택제 전환 공무원의 승진소요최저연수 산입은 다음 각 호에 따른다.",
        valid_time=DateRange(date(2026, 1, 1)),
        applies_to=frozenset({"local_general_service"}),
        topic_tags=frozenset({"performance_and_promotion"}),
        parent_provision_id="PARENT",
        source_hash="b" * 64,
    )
    everything = (parent, child)
    indexed = searchable_provisions(everything)
    pipeline = RetrievalPipeline(
        everything,
        CharNgramLexicalRetriever(indexed),
        InMemoryVectorRetriever(indexed),
    )

    result = pipeline.retrieve(
        "승진소요최저연수 산입 근거",
        config_id="H3",
        top_k=5,
        reference_date=date(2026, 8, 10),
        subject="local_general_service",
    )

    assert [p.provision_id for p in result.context] == ["CHILD"]


def test_a_source_with_no_version_at_the_reference_date_is_reported() -> None:
    """어떤 날짜에는 그 법령의 버전이 corpus에 아예 없다.

    임용령은 2024-06-27에 끝난 스냅샷과 2026-06-30에 시작하는 스냅샷 두 개뿐이라
    2024-07-01은 두 버전 사이의 빈 구간이다. 그 날짜로 승진을 물으면 임용령은 한 건도
    남지 않고 지방공무원법 부칙만 살아남는다. 결과가 비어 있지 않으므로 기존
    `invalid_effective_version` 경로는 울리지 않는다. 조용히 엉뚱한 근거가 나간다.
    """
    from insaon.adapters.retrieval import (
        CharNgramLexicalRetriever,
        InMemoryVectorRetriever,
        RetrievalPipeline,
    )

    def provision(pid: str, source: str, start: date, end: date | None) -> Provision:
        return Provision(
            provision_id=pid,
            source_id=source,
            article_path="제33조 제1항",
            title="승진소요 최저연수",
            text="공무원이 승진하려면 해당 계급에 재직해야 한다.",
            valid_time=DateRange(start, end),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"performance_and_promotion"}),
            source_hash="c" * 64,
        )

    everything = (
        provision("OLD", "DECREE-APPOINTMENT-20230613", date(2023, 6, 13), date(2024, 6, 27)),
        provision("NEW", "DECREE-APPOINTMENT", date(2026, 6, 30), None),
        provision("LAW", "LAW-LOCAL", date(2022, 12, 27), None),
    )
    pipeline = RetrievalPipeline(
        everything,
        CharNgramLexicalRetriever(everything),
        InMemoryVectorRetriever(everything),
    )
    ids = frozenset({"DECREE-APPOINTMENT-20230613", "DECREE-APPOINTMENT", "LAW-LOCAL"})

    gap = pipeline.sources_without_effective_version(
        date(2024, 7, 1), "local_general_service", ids
    )
    covered = pipeline.sources_without_effective_version(
        date(2026, 8, 10), "local_general_service", ids
    )

    assert gap == ("DECREE-APPOINTMENT", "DECREE-APPOINTMENT-20230613")
    assert covered == ("DECREE-APPOINTMENT-20230613",)
