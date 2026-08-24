from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal, cast


def _load(path: Path) -> dict[str, Any] | None:
    try:
        return cast(
            dict[str, Any],
            json.loads(path.read_text(encoding="utf-8")),
        )
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _private_root(root: Path) -> Path:
    local = root / "private"
    external = root.parent.parent / "private"
    return external if external.is_dir() else local


def release_prerequisite_errors(
    root: Path,
    profile: Literal["legal", "pilot"],
) -> list[str]:
    errors: list[str] = []
    private = _private_root(root)
    if profile == "legal":
        index = _load(private / "legal/index/manifest.json")
        if index is None or index.get("status") != "approved_legal_index":
            errors.append("approved legal index manifest is missing")
        annotation = _load(
            private / "evals/test_mvp_locked.legal.manifest.json"
        )
        if annotation is None:
            errors.append("independent legal annotation manifest is missing")
        elif (
            int(annotation.get("case_count", 0)) < 60
            or int(annotation.get("reviewer_count", 0)) < 1
            or int(annotation.get("adjudicated_count", 0))
            < int(annotation.get("case_count", 0))
        ):
            errors.append("independent legal annotation is incomplete")

        result_paths = sorted((root / "evals/results/legal").glob("*.json"))
        results = [_load(path) for path in result_paths]
        valid_results = [result for result in results if result is not None]
        if not valid_results:
            errors.append("legal evaluation results are missing")
        elif any(
            int(result.get("fatal_errors", {}).get("total", -1)) != 0
            for result in valid_results
        ):
            errors.append("legal evaluation contains fatal errors")
        if index is not None and annotation is not None:
            if (
                annotation.get("source_manifest_hash")
                != index.get("source_manifest_hash")
                or annotation.get("index_version") != index.get("version_id")
            ):
                errors.append("annotation and legal index versions differ")
            if any(
                result.get("source_manifest_hash")
                != index.get("source_manifest_hash")
                or result.get("index_version") != index.get("version_id")
                for result in valid_results
            ):
                errors.append("legal result and index versions differ")
        return errors

    legal_release = _load(root / "artifacts/release/legal-manifest.json")
    if (
        legal_release is None
        or legal_release.get("release_status") != "legal_validation_candidate"
    ):
        errors.append("legal release manifest is missing")
    deployment = _load(root / "artifacts/deployment/pilot-smoke.json")
    if deployment is None or deployment.get("status") != "passed":
        errors.append("deployment smoke artifact is missing")
    shadow = _load(private / "research/shadow-study.manifest.json")
    if shadow is None or int(shadow.get("completed_sessions", 0)) <= 0:
        errors.append("completed shadow-study manifest is missing")
    return errors
