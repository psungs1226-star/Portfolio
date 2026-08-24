from __future__ import annotations

import hashlib
import json
from typing import Any

_COMPARE_FIELDS = (
    "source_id",
    "article_path",
    "title",
    "text",
    "proviso_text",
    "parent_provision_id",
    "effective_from",
    "effective_to",
    "applies_to",
    "topic_tags",
    "relation_ids",
    "source_hash",
)


def _fingerprint(provision: dict[str, Any]) -> str:
    comparable = {field: provision.get(field) for field in _COMPARE_FIELDS}
    return hashlib.sha256(
        json.dumps(
            comparable,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()


def diff_legal_candidates(
    previous: dict[str, Any] | None,
    current: dict[str, Any],
) -> dict[str, Any]:
    previous_by_id = {
        str(item["provision_id"]): item
        for item in (previous or {}).get("provisions", [])
    }
    current_by_id = {
        str(item["provision_id"]): item
        for item in current.get("provisions", [])
    }
    previous_ids = set(previous_by_id)
    current_ids = set(current_by_id)
    added = sorted(current_ids - previous_ids)
    removed = sorted(previous_ids - current_ids)
    changed = sorted(
        provision_id
        for provision_id in previous_ids & current_ids
        if _fingerprint(previous_by_id[provision_id])
        != _fingerprint(current_by_id[provision_id])
    )
    unchanged_count = len(previous_ids & current_ids) - len(changed)
    return {
        "schema_version": "0.1.0",
        "baseline_status": "initial_candidate" if previous is None else "compared",
        "previous_source_manifest_hash": (
            previous.get("source_manifest_hash") if previous is not None else None
        ),
        "current_source_manifest_hash": current.get("source_manifest_hash"),
        "summary": {
            "previous": len(previous_ids),
            "current": len(current_ids),
            "added": len(added),
            "removed": len(removed),
            "changed": len(changed),
            "unchanged": unchanged_count,
        },
        "added_provision_ids": added,
        "removed_provision_ids": removed,
        "changed_provision_ids": changed,
    }

