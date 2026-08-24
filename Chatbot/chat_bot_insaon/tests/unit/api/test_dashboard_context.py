import json
from pathlib import Path

from insaon.api.dashboard import load_dashboard_context


def _write_json(path: Path, value: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding="utf-8")


def test_dashboard_context_uses_only_public_aggregate_artifacts(
    tmp_path: Path,
) -> None:
    _write_json(
        tmp_path / "phases/00-foundation/index.json",
        {
            "steps": [
                {"status": "completed"},
                {"status": "blocked"},
                {"status": "pending"},
            ]
        },
    )
    _write_json(
        tmp_path / "artifacts/legal/quality-audit.json",
        {
            "check_summary": {"passed": 12, "total": 12},
            "quality_counts": {
                "fatal": 0,
                "provisions": 4106,
                "supplementary": 1510,
            },
        },
    )
    _write_json(
        tmp_path / "artifacts/legal/human-review-readiness.json",
        {
            "source_count": 3,
            "provision_count": 4106,
            "human_approval": "pending",
            "reviewer_count": 0,
        },
    )
    _write_json(
        tmp_path / "artifacts/release/manifest.json",
        {
            "release_status": "synthetic_regression_candidate",
            "selected_config": "H3",
            "selected_fatal_errors": 0,
            "legal_accuracy_status": "unmeasured",
            "official_corpus_release": "hold",
        },
    )
    _write_json(
        tmp_path / "artifacts/provider/local-smoke.json",
        {
            "status": "passed",
            "api_key_required": False,
            "runtime": {
                "generation": {"model": "qwen3:4b-instruct"},
                "embedding": {"model": "bge-m3:latest"},
            },
        },
    )

    context = load_dashboard_context(tmp_path)

    assert context["steps"] == {
        "completed": 1,
        "blocked": 1,
        "pending": 1,
        "total": 3,
    }
    assert context["corpus"]["provision_count"] == 4106
    assert context["corpus"]["approval"] == "pending"
    assert context["model"]["api_key_required"] is False
    assert context["release"]["legal_accuracy"] == "unmeasured"


def test_dashboard_context_fails_closed_when_artifacts_are_missing(
    tmp_path: Path,
) -> None:
    context = load_dashboard_context(tmp_path)

    assert context["steps"]["total"] == 0
    assert context["corpus"]["provision_count"] == 0
    assert context["model"]["status"] == "unavailable"
    assert context["release"]["official_corpus_release"] == "hold"


def test_repository_root_publishes_every_artifact_the_dashboard_reads() -> None:
    """A published checkout must not render the fail-closed zeros above.

    ``artifacts/`` is gitignored except for a reviewed allowlist. If that allowlist
    ever loses a file, the dashboard degrades silently to "0건 / unavailable"
    instead of raising, so the guarantee is asserted here.
    """
    root = Path(__file__).resolve().parents[3]
    context = load_dashboard_context(root)

    assert context["steps"]["total"] > 0
    assert context["corpus"]["provision_count"] > 0
    assert context["corpus"]["source_count"] > 0
    assert context["model"]["status"] != "unavailable"
    assert context["release"]["status"] != "unavailable"
