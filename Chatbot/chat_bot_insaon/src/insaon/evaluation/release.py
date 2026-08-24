from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, cast


class ReleaseGateError(RuntimeError):
    pass


def load_result(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ReleaseGateError(f"result root must be an object: {path}")
    return cast(dict[str, Any], value)


def selected_release_allowed(result: dict[str, Any]) -> bool:
    return (
        result.get("status") == "completed"
        and result.get("system", {}).get("config_id") == "H3"
        and result.get("fatal_errors", {}).get("total") == 0
        and _evaluated_on_a_fully_distinct_set(result)
    )


def _evaluated_on_a_fully_distinct_set(result: dict[str, Any]) -> bool:
    """The gate must not be keyed to a literal case count.

    It previously required exactly 60 cases, which passed while 48 of those 60 were
    duplicates of the other 12 and would have failed for a larger, better set. What
    matters for release is that cases were evaluated and that none of them are padding.
    """
    data = result.get("data", {})
    total = data.get("case_count")
    unique = data.get("unique_case_count")
    return isinstance(total, int) and total > 0 and unique == total


# Every configuration the ablation must publish together. A missing arm means the
# comparison table was assembled from runs that did not share the same conditions.
ABLATION_CONFIG_IDS = frozenset({"B0", "B1", "H1", "H2", "H3", "H4"})


def assert_same_evaluation_conditions(results: list[dict[str, Any]]) -> None:
    if len(results) != len(ABLATION_CONFIG_IDS):
        raise ReleaseGateError("B0/B1/H1/H2/H3/H4 result set is incomplete")
    expected_configs = set(ABLATION_CONFIG_IDS)
    if {result["system"]["config_id"] for result in results} != expected_configs:
        raise ReleaseGateError("evaluation config IDs are incomplete")
    locked_fields = (
        ("data", "dataset_hash"),
        ("data", "source_snapshot_hash"),
        ("data", "case_count"),
        ("execution", "top_k"),
        ("execution", "generation_repeats"),
        ("execution", "environment_lock_hash"),
    )
    for section, key in locked_fields:
        if len({result[section][key] for result in results}) != 1:
            raise ReleaseGateError(f"evaluation condition drift: {section}.{key}")


def artifact_hashes(root: Path, paths: list[Path]) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(paths)
    }
