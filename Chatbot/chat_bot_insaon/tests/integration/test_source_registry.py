from insaon.adapters.storage import SessionFactory, SourceRegistry, create_database


def test_snapshot_reingestion_is_idempotent_and_preserves_existing(semantic_snapshot) -> None:
    registry = SourceRegistry(SessionFactory(create_database()))
    assert registry.add_snapshot(semantic_snapshot)
    assert not registry.add_snapshot(semantic_snapshot)
