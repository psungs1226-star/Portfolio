from insaon.adapters.retrieval import (
    CharNgramLexicalRetriever,
    InMemoryVectorRetriever,
    RetrievalPipeline,
)
from tests.unit.retrieval.test_retrievers import provisions


def test_b0_b1_h1_keep_separate_retrieval_contracts() -> None:
    docs = provisions()
    pipeline = RetrievalPipeline(
        docs, CharNgramLexicalRetriever(docs), InMemoryVectorRetriever(docs)
    )
    b0 = pipeline.retrieve("질병 휴직", config_id="B0", top_k=3)
    b1 = pipeline.retrieve("질병 휴직", config_id="B1", top_k=3)
    h1 = pipeline.retrieve("질병 휴직", config_id="H1", top_k=3)
    assert {item.source for item in b0.candidates} == {"char-ngram-v1"}
    assert {item.source for item in b1.candidates} == {"deterministic-vector-v1"}
    assert {item.source for item in h1.candidates} == {"rrf-v1"}
