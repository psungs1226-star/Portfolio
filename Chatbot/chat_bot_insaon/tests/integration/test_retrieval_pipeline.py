from datetime import date

from insaon.adapters.retrieval import (
    CharNgramLexicalRetriever,
    IdfWeightedReranker,
    InMemoryVectorRetriever,
    RetrievalPipeline,
)
from tests.unit.retrieval.test_retrievers import provisions


def test_retrieval_pipeline_is_deterministic_across_all_configs() -> None:
    docs = provisions()
    pipeline = RetrievalPipeline(
        docs,
        CharNgramLexicalRetriever(docs),
        InMemoryVectorRetriever(docs),
        IdfWeightedReranker({item.provision_id: item for item in docs}),
    )
    for config in ("B0", "B1", "H1", "H2", "H3"):
        kwargs = (
            {"reference_date": date(2024, 1, 1), "subject": "local_general_service"}
            if config in {"H2", "H3"}
            else {}
        )
        first = pipeline.retrieve("질병 휴직", config_id=config, top_k=3, **kwargs)
        second = pipeline.retrieve("질병 휴직", config_id=config, top_k=3, **kwargs)
        assert first == second
