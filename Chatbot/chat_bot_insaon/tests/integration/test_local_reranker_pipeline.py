from datetime import date

from local_transport import ScriptedOllamaTransport

from insaon.adapters.provider import OllamaClient
from insaon.adapters.retrieval import (
    CharNgramLexicalRetriever,
    InMemoryVectorRetriever,
    OllamaEmbeddingGateway,
    OllamaReranker,
    RetrievalPipeline,
)
from insaon.application.factory import synthetic_demo_provisions


def test_local_reranker_keeps_exception_in_expanded_context() -> None:
    transport = ScriptedOllamaTransport()
    client = OllamaClient(transport, timeout_seconds=5, max_retries=0)
    provisions = synthetic_demo_provisions()
    mapping = {item.provision_id: item for item in provisions}
    pipeline = RetrievalPipeline(
        provisions,
        CharNgramLexicalRetriever(provisions),
        InMemoryVectorRetriever(
            provisions,
            OllamaEmbeddingGateway(
                client,
                model_id="bge-m3",
                dimensions=1024,
                version="embedding-v2-local",
            ),
        ),
        OllamaReranker(
            client,
            mapping,
            model_id="qwen3:4b-instruct",
            version="reranker-v2-local",
        ),
    )
    result = pipeline.retrieve(
        "2024-01-01 질병휴직 공개 근거",
        config_id="H3",
        top_k=5,
        reference_date=date(2024, 1, 1),
        subject="local_general_service",
    )
    context_ids = {item.provision_id for item in result.context}
    assert "SYNTHETIC-EXCEPTION-B-001" in context_ids
    assert "SYNTH-SUPPLEMENT-001" in context_ids
    assert "SYNTHETIC-NOT-EFFECTIVE-B-001" not in context_ids
