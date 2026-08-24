from datetime import date

from insaon.adapters.retrieval import (
    CharNgramLexicalRetriever,
    DeterministicEmbeddingGateway,
    InMemoryVectorRetriever,
    reciprocal_rank_fusion,
)
from insaon.domain import DateRange, Provision


def provisions() -> list[Provision]:
    return [
        Provision(
            provision_id=f"P-{index}",
            source_id="S",
            article_path=f"합성 제{index}조",
            title="합성",
            text=text,
            valid_time=DateRange(date(2024, 1, 1)),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"synthetic"}),
        )
        for index, text in enumerate(
            ["질병휴직 복직 기준일", "육아 휴직 대상 자녀", "일반 안내"], start=1
        )
    ]


def test_lexical_vector_and_rrf_return_stable_candidate_ids() -> None:
    docs = provisions()
    lexical = CharNgramLexicalRetriever(docs).retrieve("질병 휴직", 3)
    vector = InMemoryVectorRetriever(docs).retrieve("질병 휴직", 3)
    hybrid = reciprocal_rank_fusion([lexical, vector], 3)
    assert lexical[0].provision_id == "P-1"
    assert [item.rank for item in hybrid] == [1, 2, 3]
    assert hybrid == reciprocal_rank_fusion([lexical, vector], 3)


def test_deterministic_embedding_is_normalized_and_repeatable() -> None:
    gateway = DeterministicEmbeddingGateway(dimensions=16)
    first = gateway.embed(["동일 문장"])[0]
    second = gateway.embed(["동일 문장"])[0]
    assert first == second
    assert abs(sum(value * value for value in first) - 1.0) < 1e-9


def test_full_corpus_vector_index_batches_without_lexical_shortlisting() -> None:
    class LimitedGateway(DeterministicEmbeddingGateway):
        batch_limit = 2

        def __init__(self) -> None:
            super().__init__(dimensions=16)
            self.batch_sizes: list[int] = []

        def embed(self, texts):  # type: ignore[no-untyped-def]
            self.batch_sizes.append(len(texts))
            assert len(texts) <= self.batch_limit
            return super().embed(texts)

    docs = provisions()
    gateway = LimitedGateway()
    retriever = InMemoryVectorRetriever(docs, gateway=gateway)

    assert len(retriever.retrieve("일반 안내", 3)) == 3
    assert gateway.batch_sizes[:2] == [2, 1]
    assert gateway.batch_sizes[-1] == 1


def test_full_corpus_vector_index_reuses_versioned_private_cache(tmp_path) -> None:
    class CountingGateway(DeterministicEmbeddingGateway):
        def __init__(self) -> None:
            super().__init__(dimensions=16)
            self.call_count = 0

        def embed(self, texts):  # type: ignore[no-untyped-def]
            self.call_count += 1
            return super().embed(texts)

    cache_path = tmp_path / "vector-cache.json"
    first_gateway = CountingGateway()
    InMemoryVectorRetriever(
        provisions(),
        gateway=first_gateway,
        cache_path=cache_path,
        cache_key="fixture-v1",
    )
    second_gateway = CountingGateway()
    retriever = InMemoryVectorRetriever(
        provisions(),
        gateway=second_gateway,
        cache_path=cache_path,
        cache_key="fixture-v1",
    )

    assert cache_path.is_file()
    assert first_gateway.call_count == 1
    assert second_gateway.call_count == 0
    assert retriever.retrieve("질병 휴직", 1)[0].provision_id == "P-1"
    assert second_gateway.call_count == 1
