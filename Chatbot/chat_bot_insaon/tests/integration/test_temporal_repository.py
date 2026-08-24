from datetime import date

from insaon.adapters.source import ProvisionParser
from insaon.adapters.storage import SessionFactory, SourceRegistry, create_database


def test_temporal_repository_uses_valid_time_not_system_time(semantic_snapshot) -> None:
    registry = SourceRegistry(SessionFactory(create_database()))
    registry.add_snapshot(semantic_snapshot)
    registry.save_parsed(ProvisionParser().parse(semantic_snapshot))
    registry.approve_snapshot(
        semantic_snapshot.snapshot_id, "REVIEWER", semantic_snapshot.content_hash
    )
    registry.promote_snapshot(
        semantic_snapshot.snapshot_id, "REVIEWER", semantic_snapshot.content_hash
    )
    assert registry.effective_provisions(date(2023, 12, 31), "local_general_service") == ()
    assert len(
        registry.effective_provisions(date(2024, 1, 1), "local_general_service")
    ) == 3
    assert registry.effective_provisions(date(2024, 1, 1), "national_service") == ()
