from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime
from typing import Any


class AnnotationContractError(ValueError):
    pass


def _timestamp(value: object, field: str, errors: list[str]) -> None:
    try:
        datetime.fromisoformat(str(value))
    except ValueError:
        errors.append(f"{field} must be an RFC3339 timestamp")


def _expected_differences(
    author_expected: dict[str, Any],
    review_expected: dict[str, Any],
) -> list[str]:
    keys = set(author_expected) | set(review_expected)
    return sorted(
        key for key in keys if author_expected.get(key) != review_expected.get(key)
    )


def validate_annotation_records(
    records: list[dict[str, Any]],
    *,
    source_manifest_hash: str,
    index_version: str,
    known_provision_ids: set[str],
    require_reviewed: bool,
    require_adjudicated: bool,
) -> None:
    errors: list[str] = []
    if not records:
        errors.append("annotation dataset is empty")
    case_ids: set[str] = set()
    group_splits: dict[str, str] = {}
    for record in records:
        case_id = str(record.get("case_id", ""))
        group_id = str(record.get("group_id", ""))
        split = str(record.get("split", ""))
        if not case_id or case_id in case_ids:
            errors.append(f"duplicate or empty case_id: {case_id}")
        case_ids.add(case_id)
        previous_split = group_splits.setdefault(group_id, split)
        if not group_id or previous_split != split:
            errors.append(f"group split leakage: {group_id}")
        if record.get("source_manifest_hash") != source_manifest_hash:
            errors.append(f"{case_id}: source manifest drift")
        if record.get("index_version") != index_version:
            errors.append(f"{case_id}: index version drift")
        references = {
            str(value) for value in record.get("referenced_provision_ids", [])
        }
        if not references or not references <= known_provision_ids:
            errors.append(f"{case_id}: unknown or empty provision references")

        author = record.get("author_judgment")
        review = record.get("review_judgment")
        adjudication = record.get("adjudication")
        if not isinstance(author, dict):
            errors.append(f"{case_id}: author judgment is required")
            continue
        author_id = str(author.get("actor_id", ""))
        _timestamp(author.get("submitted_at"), f"{case_id}.author", errors)
        if require_reviewed and not isinstance(review, dict):
            errors.append(f"{case_id}: independent review is required")
            continue
        if not isinstance(review, dict):
            continue
        reviewer_id = str(review.get("actor_id", ""))
        _timestamp(review.get("submitted_at"), f"{case_id}.review", errors)
        if not author_id or not reviewer_id or author_id == reviewer_id:
            errors.append(f"{case_id}: author and reviewer must be distinct")
        author_expected = author.get("expected")
        review_expected = review.get("expected")
        if not isinstance(author_expected, dict) or not isinstance(review_expected, dict):
            errors.append(f"{case_id}: both raw expected judgments are required")
            continue
        differences = _expected_differences(author_expected, review_expected)
        reported_differences = sorted(
            str(value) for value in record.get("disagreement_fields", [])
        )
        if differences != reported_differences:
            errors.append(f"{case_id}: disagreement fields do not match raw judgments")

        if require_adjudicated and not isinstance(adjudication, dict):
            errors.append(f"{case_id}: adjudication record is required")
            continue
        if not isinstance(adjudication, dict):
            continue
        status = adjudication.get("status")
        if require_adjudicated and status not in {"accepted", "excluded"}:
            errors.append(f"{case_id}: adjudication must be accepted or excluded")
        adjudicator_id = str(adjudication.get("actor_id", ""))
        if status in {"accepted", "excluded"}:
            _timestamp(adjudication.get("decided_at"), f"{case_id}.adjudication", errors)
            if not adjudicator_id or adjudicator_id in {author_id, reviewer_id}:
                errors.append(
                    f"{case_id}: adjudicator must be distinct from author and reviewer"
                )
        if status == "accepted" and not isinstance(
            adjudication.get("final_expected"), dict
        ):
            errors.append(f"{case_id}: accepted case requires final expected judgment")
        if status == "excluded" and not str(
            adjudication.get("exclusion_reason") or ""
        ).strip():
            errors.append(f"{case_id}: excluded case requires a reason")
    if errors:
        raise AnnotationContractError("; ".join(errors))


def build_annotation_manifest(
    records: list[dict[str, Any]],
) -> dict[str, Any]:
    canonical_records = sorted(records, key=lambda item: str(item["case_id"]))
    encoded = (
        "\n".join(
            json.dumps(item, ensure_ascii=False, sort_keys=True)
            for item in canonical_records
        )
        + "\n"
    ).encode()
    agreed = 0
    disagreed = 0
    reviewers: set[str] = set()
    adjudicated = 0
    excluded = 0
    splits: Counter[str] = Counter()
    for record in canonical_records:
        review = record.get("review_judgment")
        author = record.get("author_judgment", {})
        if isinstance(review, dict):
            reviewers.add(str(review.get("actor_id")))
            if author.get("expected") == review.get("expected"):
                agreed += 1
            else:
                disagreed += 1
        adjudication = record.get("adjudication", {})
        if adjudication.get("status") in {"accepted", "excluded"}:
            adjudicated += 1
        if adjudication.get("status") == "excluded":
            excluded += 1
        splits[str(record.get("split"))] += 1
    denominator = agreed + disagreed
    return {
        "schema_version": "0.1.0",
        "profile": "independent-legal-annotation",
        "dataset_sha256": hashlib.sha256(encoded).hexdigest(),
        "case_count": len(canonical_records),
        "group_count": len(
            {str(record["group_id"]) for record in canonical_records}
        ),
        "reviewer_count": len(reviewers),
        "split_counts": dict(sorted(splits.items())),
        "agreement": {
            "agreed": agreed,
            "disagreed": disagreed,
            "denominator": denominator,
            "rate": agreed / denominator if denominator else None,
        },
        "adjudicated_count": adjudicated,
        "excluded_count": excluded,
    }

