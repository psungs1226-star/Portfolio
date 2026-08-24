import pytest
from local_transport import ScriptedOllamaTransport

from insaon.adapters.provider import OllamaClient
from insaon.adapters.retrieval import OllamaReranker
from insaon.application.factory import synthetic_demo_provisions
from insaon.application.provider_runtime import ProviderFailureCode, ProviderRuntimeError
from insaon.domain import RetrievalCandidate


def _reranker(transport: ScriptedOllamaTransport) -> OllamaReranker:
    provisions = synthetic_demo_provisions()
    return OllamaReranker(
        OllamaClient(transport, timeout_seconds=5, max_retries=0),
        {item.provision_id: item for item in provisions},
        model_id="qwen3:4b-instruct",
        version="reranker-v2-local",
    )


def _candidates() -> tuple[RetrievalCandidate, ...]:
    return tuple(
        RetrievalCandidate(item.provision_id, rank, 0.1, "H1")
        for rank, item in enumerate(synthetic_demo_provisions()[:3], start=1)
    )


def test_local_reranker_reorders_only_supplied_candidates() -> None:
    transport = ScriptedOllamaTransport()
    ranked = _reranker(transport).rerank("질병휴직", _candidates(), top_k=2)
    assert len(ranked) == 2
    assert {item.provision_id for item in ranked} <= {
        item.provision_id for item in _candidates()
    }
    assert ranked[0].raw_score >= ranked[1].raw_score
    assert transport.calls[0][1]["keep_alive"] == "20m"


def test_local_reranker_rejects_candidate_injection() -> None:
    transport = ScriptedOllamaTransport()
    transport.reranker_adds_candidate = True
    with pytest.raises(ProviderRuntimeError) as captured:
        _reranker(transport).rerank("질병휴직", _candidates(), top_k=2)
    assert captured.value.failure.code is ProviderFailureCode.INVALID_SCHEMA


def test_local_reranker_completes_an_omitted_candidate_deterministically() -> None:
    transport = ScriptedOllamaTransport()
    transport.reranker_omits_candidate = True
    reranker = _reranker(transport)

    ranked = reranker.rerank("질병휴직", _candidates(), top_k=3)

    assert {item.provision_id for item in ranked} == {
        item.provision_id for item in _candidates()
    }
    assert reranker.last_output_complete is False
    assert ranked[-1].metadata["reranker_completion"] == "deterministic_tail"
