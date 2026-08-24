from datetime import UTC, datetime

import pytest
from local_transport import ScriptedOllamaTransport

from insaon.adapters.provider import OllamaClient
from insaon.adapters.retrieval import (
    InMemoryVectorRetriever,
    OllamaEmbeddingGateway,
    build_local_vector_index_manifest,
)
from insaon.application.factory import synthetic_demo_provisions


def _gateway() -> OllamaEmbeddingGateway:
    return OllamaEmbeddingGateway(
        OllamaClient(ScriptedOllamaTransport(), timeout_seconds=5, max_retries=0),
        model_id="bge-m3",
        dimensions=1024,
        version="embedding-v2-local",
    )


def test_local_vector_index_has_artifact_and_snapshot_manifest() -> None:
    gateway = _gateway()
    provisions = synthetic_demo_provisions()
    retriever = InMemoryVectorRetriever(provisions, gateway=gateway)
    manifest = build_local_vector_index_manifest(
        gateway=gateway,
        embedding_artifact_digest="sha256:" + "3" * 64,
        source_snapshot_hash="1" * 64,
        document_count=len(provisions),
        created_at=datetime(2026, 7, 29, tzinfo=UTC),
    )
    assert retriever.retrieve("질병휴직", top_k=3)
    assert manifest.embedding_model == "bge-m3"
    assert manifest.dimensions == 1024
    assert manifest.embedding_artifact_digest.startswith("sha256:")


def test_local_vector_manifest_rejects_unknown_artifact_digest() -> None:
    with pytest.raises(ValueError, match="content-addressed"):
        build_local_vector_index_manifest(
            gateway=_gateway(),
            embedding_artifact_digest="unknown",
            source_snapshot_hash="1" * 64,
            document_count=1,
        )
