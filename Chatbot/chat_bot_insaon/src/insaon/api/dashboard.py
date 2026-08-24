"""Public, non-sensitive dashboard status assembled from release artifacts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _step_counts(root: Path) -> dict[str, int]:
    counts = {"completed": 0, "blocked": 0, "pending": 0}
    for path in sorted((root / "phases").glob("[0-9][0-9]-*/index.json")):
        phase = _read_json(path)
        steps = phase.get("steps", [])
        if not isinstance(steps, list):
            continue
        for step in steps:
            if not isinstance(step, dict):
                continue
            status = step.get("status")
            if status in counts:
                counts[status] += 1
    return {**counts, "total": sum(counts.values())}


def load_dashboard_context(root: Path) -> dict[str, Any]:
    """Load only allowlisted public artifacts and return display-safe aggregates."""
    audit = _read_json(root / "artifacts/legal/quality-audit.json")
    readiness = _read_json(root / "artifacts/legal/human-review-readiness.json")
    wide_audit = _read_json(root / "artifacts/legal/wide-quality-audit.json")
    wide_readiness = _read_json(root / "artifacts/legal/wide-human-review-readiness.json")
    wide_summary = _read_json(root / "artifacts/legal/wide-candidate-summary.json")
    wide_probe = _read_json(root / "artifacts/legal/wide-source-probe.json")
    if wide_audit:
        audit = wide_audit
    if wide_readiness:
        readiness = wide_readiness
    release = _read_json(root / "artifacts/release/manifest.json")
    local_smoke = _read_json(root / "artifacts/provider/local-smoke.json")
    quality = audit.get("quality_counts", {})
    check_summary = audit.get("check_summary", {})
    runtime = local_smoke.get("runtime", {})
    generation = runtime.get("generation", {})
    embedding = runtime.get("embedding", {})
    steps = _step_counts(root)

    return {
        "steps": steps,
        "corpus": {
            "source_count": wide_probe.get(
                "source_count", readiness.get("source_count", 0)
            ),
            "parsed_source_count": wide_summary.get(
                "source_count", readiness.get("source_count", 0)
            ),
            "provision_count": wide_summary.get(
                "provision_count",
                readiness.get("provision_count", quality.get("provisions", 0)),
            ),
            "supplementary_count": quality.get("supplementary", 0),
            "audit_passed": check_summary.get("passed", 0),
            "audit_total": check_summary.get("total", 0),
            "fatal_count": quality.get("fatal", 0),
            "approval": readiness.get("human_approval", "unavailable"),
            "reviewer_count": readiness.get("reviewer_count", 0),
            "review_mode": "wide_evidence_candidate" if wide_summary else "deep_review_candidate",
        },
        "model": {
            "status": local_smoke.get("status", "unavailable"),
            "generation": generation.get("model", "unavailable"),
            "embedding": embedding.get("model", "unavailable"),
            "api_key_required": local_smoke.get("api_key_required"),
        },
        "release": {
            "status": release.get("release_status", "unavailable"),
            "selected_config": release.get("selected_config", "unavailable"),
            "fatal_errors": release.get("selected_fatal_errors"),
            "legal_accuracy": release.get("legal_accuracy_status", "unmeasured"),
            "official_corpus_release": release.get(
                "official_corpus_release", "hold"
            ),
        },
    }
