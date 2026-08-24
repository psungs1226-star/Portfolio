from dataclasses import replace
from datetime import date

from insaon.adapters.retrieval import (
    CharNgramLexicalRetriever,
    InMemoryVectorRetriever,
    RetrievalPipeline,
)
from insaon.domain import DateRange, RetrievalCandidate
from tests.unit.retrieval.test_retrievers import provisions


class RankedRetriever:
    def __init__(self, provision_ids: tuple[str, ...]) -> None:
        self._provision_ids = provision_ids

    def retrieve(self, query: str, top_k: int) -> tuple[RetrievalCandidate, ...]:
        del query
        return tuple(
            RetrievalCandidate(provision_id, rank, 1 / rank, "ranked-test")
            for rank, provision_id in enumerate(self._provision_ids[:top_k], start=1)
        )


def test_h2_filters_not_yet_effective_and_wrong_subject_before_generation() -> None:
    docs = provisions()
    docs[0] = replace(docs[0], valid_time=DateRange(date(2025, 1, 1)))
    pipeline = RetrievalPipeline(
        docs, CharNgramLexicalRetriever(docs), InMemoryVectorRetriever(docs)
    )
    missing = pipeline.retrieve("질병", config_id="H2", top_k=3)
    assert missing.context_incomplete
    result = pipeline.retrieve(
        "질병",
        config_id="H2",
        top_k=3,
        reference_date=date(2024, 1, 1),
        subject="local_general_service",
    )
    assert "P-1" not in {item.provision_id for item in result.candidates}

    future_only = (docs[0],)
    future_pipeline = RetrievalPipeline(
        future_only,
        CharNgramLexicalRetriever(future_only),
        InMemoryVectorRetriever(future_only),
    )
    invalid_version = future_pipeline.retrieve(
        "질병",
        config_id="H2",
        top_k=1,
        reference_date=date(2024, 1, 1),
        subject="local_general_service",
    )
    assert invalid_version.context_incomplete
    assert invalid_version.reason == "invalid_effective_version"


def test_h2_filters_time_before_top_k_when_future_version_ranks_first() -> None:
    template = provisions()[0]
    future = replace(
        template,
        provision_id="future",
        valid_time=DateRange(date(2026, 7, 1)),
    )
    historical = replace(
        template,
        provision_id="historical",
        valid_time=DateRange(date(2025, 1, 1), date(2026, 6, 30)),
    )
    docs = (future, historical)
    retriever = RankedRetriever(("future", "historical"))
    pipeline = RetrievalPipeline(docs, retriever, retriever)

    result = pipeline.retrieve(
        "정근수당",
        config_id="H2",
        top_k=1,
        reference_date=date(2026, 4, 1),
        subject="local_general_service",
        source_ids=frozenset({template.source_id}),
    )

    assert [item.provision_id for item in result.context] == ["historical"]


def test_h2_does_not_drop_valid_version_below_a_large_invalid_shortlist() -> None:
    template = provisions()[0]
    future = tuple(
        replace(
            template,
            provision_id=f"future-{index:03d}",
            valid_time=DateRange(date(2026, 7, 1)),
        )
        for index in range(100)
    )
    historical = replace(
        template,
        provision_id="historical-rank-101",
        valid_time=DateRange(date(2025, 1, 1), date(2026, 7, 1)),
    )
    docs = (*future, historical)
    retriever = RankedRetriever(tuple(item.provision_id for item in docs))
    pipeline = RetrievalPipeline(docs, retriever, retriever)

    result = pipeline.retrieve(
        "정근수당",
        config_id="H2",
        top_k=1,
        reference_date=date(2026, 4, 1),
        subject="local_general_service",
        source_ids=frozenset({template.source_id}),
    )

    assert [item.provision_id for item in result.context] == ["historical-rank-101"]
