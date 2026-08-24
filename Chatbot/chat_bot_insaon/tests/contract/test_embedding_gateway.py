from insaon.adapters.retrieval import DeterministicEmbeddingGateway


def test_embedding_contract_exposes_version_dimensions_and_batch_shape() -> None:
    gateway = DeterministicEmbeddingGateway(dimensions=32)
    vectors = gateway.embed(["a", "b"])
    assert gateway.model_id == "deterministic-hash-projection-v2"
    assert gateway.dimensions == 32
    assert len(vectors) == 2
    assert all(len(vector) == 32 for vector in vectors)
