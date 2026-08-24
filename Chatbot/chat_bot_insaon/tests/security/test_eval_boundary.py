from pathlib import Path

import pytest

from insaon.evaluation.boundary import assert_public_import_allowed


def test_private_evaluation_data_cannot_be_imported_by_runtime() -> None:
    root = Path("/tmp/project")
    with pytest.raises(PermissionError):
        assert_public_import_allowed(root / "evals/private/locked.jsonl", root)


def test_public_synthetic_seed_is_allowed() -> None:
    root = Path("/tmp/project")
    assert_public_import_allowed(root / "evals/samples/dev.sample.jsonl", root)
