from dataclasses import replace
from datetime import date

from insaon.adapters.retrieval import (
    CharNgramLexicalRetriever,
    IdfWeightedReranker,
    InMemoryVectorRetriever,
    RetrievalPipeline,
)
from tests.unit.retrieval.test_retrievers import provisions


def test_h3_expands_parent_and_direct_exception_relations() -> None:
    docs = provisions()
    docs[0] = replace(docs[0], relation_ids=("P-2",))
    mapping = {item.provision_id: item for item in docs}
    pipeline = RetrievalPipeline(
        docs,
        CharNgramLexicalRetriever(docs),
        InMemoryVectorRetriever(docs),
        IdfWeightedReranker(mapping),
    )
    result = pipeline.retrieve(
        "질병 휴직",
        config_id="H3",
        top_k=1,
        reference_date=date(2024, 1, 1),
        subject="local_general_service",
    )
    assert {item.provision_id for item in result.context} == {"P-1", "P-2"}
    assert not result.context_incomplete
