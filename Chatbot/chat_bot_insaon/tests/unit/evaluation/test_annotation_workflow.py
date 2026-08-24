from typing import Any

import pytest

from insaon.evaluation.annotation import (
    AnnotationContractError,
    build_annotation_manifest,
    validate_annotation_records,
)


def _record(
    *,
    case_id: str = "CASE-LEGAL-001",
    group_id: str = "GROUP-LEGAL-001",
    split: str = "test_mvp_locked",
) -> dict[str, Any]:
    expected = {
        "action": "ask",
        "answer_status": "REVIEW_REQUIRED",
        "required_condition_fields": ["reference_date"],
        "required_evidence_ids": ["LAW:article:63"],
        "required_exception_ids": [],
        "forbidden_evidence_ids": [],
    }
    return {
        "schema_version": "0.1.0",
        "case_id": case_id,
        "group_id": group_id,
        "split": split,
        "source_manifest_hash": "a" * 64,
        "index_version": "LEGAL-IDX-1234567890abcdef",
        "referenced_provision_ids": ["LAW:article:63"],
        "author_judgment": {
            "actor_id": "AUTHOR-01",
            "submitted_at": "2026-07-29T21:00:00+09:00",
            "expected": expected,
        },
        "review_judgment": {
            "actor_id": "REVIEWER-01",
            "submitted_at": "2026-07-29T21:10:00+09:00",
            "expected": expected,
        },
        "disagreement_fields": [],
        "adjudication": {
            "status": "accepted",
            "actor_id": "ADJUDICATOR-01",
            "decided_at": "2026-07-29T21:20:00+09:00",
            "final_expected": expected,
            "exclusion_reason": None,
        },
    }


def test_annotation_manifest_preserves_role_separation_and_hash() -> None:
    records = [_record()]

    validate_annotation_records(
        records,
        source_manifest_hash="a" * 64,
        index_version="LEGAL-IDX-1234567890abcdef",
        known_provision_ids={"LAW:article:63"},
        require_reviewed=True,
        require_adjudicated=True,
    )
    manifest = build_annotation_manifest(records)

    assert manifest["case_count"] == 1
    assert manifest["reviewer_count"] == 1
    assert manifest["agreement"]["agreed"] == 1
    assert len(manifest["dataset_sha256"]) == 64


def test_annotation_rejects_role_collision_and_group_split_leakage() -> None:
    first = _record()
    first["review_judgment"]["actor_id"] = "AUTHOR-01"
    second = _record(
        case_id="CASE-LEGAL-002",
        split="dev",
    )

    with pytest.raises(AnnotationContractError):
        validate_annotation_records(
            [first, second],
            source_manifest_hash="a" * 64,
            index_version="LEGAL-IDX-1234567890abcdef",
            known_provision_ids={"LAW:article:63"},
            require_reviewed=True,
            require_adjudicated=True,
        )


def test_annotation_rejects_unresolved_disagreement() -> None:
    record = _record()
    record["review_judgment"]["expected"] = {
        **record["review_judgment"]["expected"],
        "action": "answer",
    }
    record["disagreement_fields"] = ["action"]
    record["adjudication"]["status"] = "pending"

    with pytest.raises(AnnotationContractError, match="adjudication"):
        validate_annotation_records(
            [record],
            source_manifest_hash="a" * 64,
            index_version="LEGAL-IDX-1234567890abcdef",
            known_provision_ids={"LAW:article:63"},
            require_reviewed=True,
            require_adjudicated=True,
        )
