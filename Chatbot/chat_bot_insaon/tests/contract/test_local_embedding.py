import math

import pytest
from local_transport import ScriptedOllamaTransport

from insaon.adapters.provider import OllamaClient
from insaon.adapters.retrieval import OllamaEmbeddingGateway
from insaon.application.provider_runtime import ProviderFailureCode, ProviderRuntimeError


def _gateway(transport: ScriptedOllamaTransport) -> OllamaEmbeddingGateway:
    return OllamaEmbeddingGateway(
        OllamaClient(transport, timeout_seconds=5, max_retries=0),
        model_id="bge-m3",
        dimensions=1024,
        version="embedding-v2-local",
        batch_limit=4,
    )


def test_local_embedding_preserves_order_dimension_and_normalization() -> None:
    transport = ScriptedOllamaTransport()
    vectors = _gateway(transport).embed(["합성 조문 A", "합성 조문 B"])
    assert len(vectors) == 2
    assert all(len(vector) == 1024 for vector in vectors)
    assert all(math.isclose(sum(value * value for value in vector), 1.0) for vector in vectors)
    assert transport.calls[0][0] == "/embed"
    assert transport.calls[0][1]["keep_alive"] == "20m"


@pytest.mark.parametrize("failure", ["partial", "dimension"])
def test_local_embedding_rejects_partial_and_drift(failure: str) -> None:
    transport = ScriptedOllamaTransport()
    transport.partial_embedding_batch = failure == "partial"
    transport.embedding_dimension_delta = 1 if failure == "dimension" else 0
    with pytest.raises(ProviderRuntimeError) as captured:
        _gateway(transport).embed(["합성 A", "합성 B"])
    assert captured.value.failure.code is ProviderFailureCode.INVALID_SCHEMA
