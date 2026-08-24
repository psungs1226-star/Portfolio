import pytest

from insaon.adapters.source import ProvisionParser
from insaon.adapters.storage import (
    PromotionRejectedError,
    SessionFactory,
    SnapshotHashMismatchError,
    SourceRegistry,
    create_database,
)


def test_promotion_requires_quality_approval_and_hash(semantic_snapshot) -> None:
    registry = SourceRegistry(SessionFactory(create_database()))
    registry.add_snapshot(semantic_snapshot)
    registry.save_parsed(ProvisionParser().parse(semantic_snapshot))
    with pytest.raises(PromotionRejectedError):
        registry.promote_snapshot(
            semantic_snapshot.snapshot_id, "REVIEWER", semantic_snapshot.content_hash
        )
    with pytest.raises(SnapshotHashMismatchError):
        registry.approve_snapshot(semantic_snapshot.snapshot_id, "REVIEWER", "0" * 64)
    registry.approve_snapshot(
        semantic_snapshot.snapshot_id, "REVIEWER", semantic_snapshot.content_hash
    )
    version = registry.promote_snapshot(
        semantic_snapshot.snapshot_id, "REVIEWER", semantic_snapshot.content_hash
    )
    assert registry.active_index_version() == version


def test_failed_regression_preserves_active_index(semantic_snapshot) -> None:
    registry = SourceRegistry(SessionFactory(create_database()))
    registry.add_snapshot(semantic_snapshot)
    registry.save_parsed(ProvisionParser().parse(semantic_snapshot))
    registry.approve_snapshot(
        semantic_snapshot.snapshot_id, "REVIEWER", semantic_snapshot.content_hash
    )
    active = registry.promote_snapshot(
        semantic_snapshot.snapshot_id, "REVIEWER", semantic_snapshot.content_hash
    )
    with pytest.raises(PromotionRejectedError):
        registry.promote_snapshot(
            semantic_snapshot.snapshot_id,
            "REVIEWER",
            semantic_snapshot.content_hash,
            regression_passed=False,
        )
    assert registry.active_index_version() == active
