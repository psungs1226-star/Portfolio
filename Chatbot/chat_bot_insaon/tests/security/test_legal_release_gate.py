import json
from pathlib import Path

from insaon.evaluation.gates import release_prerequisite_errors


def test_legal_release_requires_approved_index_reviewed_set_and_results(
    tmp_path: Path,
) -> None:
    errors = release_prerequisite_errors(tmp_path, "legal")

    assert "approved legal index manifest is missing" in errors
    assert "independent legal annotation manifest is missing" in errors
    assert "legal evaluation results are missing" in errors


def test_pilot_release_requires_legal_release_deployment_and_sessions(
    tmp_path: Path,
) -> None:
    errors = release_prerequisite_errors(tmp_path, "pilot")

    assert "legal release manifest is missing" in errors
    assert "deployment smoke artifact is missing" in errors
    assert "completed shadow-study manifest is missing" in errors


def test_legal_release_rejects_fatal_result(tmp_path: Path) -> None:
    index = tmp_path / "private/legal/index"
    annotations = tmp_path / "private/evals"
    results = tmp_path / "evals/results/legal"
    index.mkdir(parents=True)
    annotations.mkdir(parents=True)
    results.mkdir(parents=True)
    (index / "manifest.json").write_text(
        json.dumps(
            {
                "status": "approved_legal_index",
                "source_manifest_hash": "a" * 64,
                "version_id": "LEGAL-IDX-1234567890abcdef",
            }
        ),
        encoding="utf-8",
    )
    (annotations / "test_mvp_locked.legal.manifest.json").write_text(
        json.dumps(
            {
                "case_count": 60,
                "reviewer_count": 1,
                "adjudicated_count": 60,
                "source_manifest_hash": "a" * 64,
                "index_version": "LEGAL-IDX-1234567890abcdef",
            }
        ),
        encoding="utf-8",
    )
    (results / "h3.json").write_text(
        json.dumps(
            {
                "source_manifest_hash": "a" * 64,
                "index_version": "LEGAL-IDX-1234567890abcdef",
                "fatal_errors": {"total": 1},
            }
        ),
        encoding="utf-8",
    )

    errors = release_prerequisite_errors(tmp_path, "legal")

    assert "legal evaluation contains fatal errors" in errors
