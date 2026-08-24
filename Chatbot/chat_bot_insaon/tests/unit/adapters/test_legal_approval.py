import hashlib
import json
from typing import Any

import pytest

from insaon.adapters.source.approval import (
    ApprovalValidationError,
    validate_candidate_approval,
)


def _payloads() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    candidate = {
        "candidate_status": "pending_human_approval",
        "source_manifest_hash": "a" * 64,
        "parser_version": "official-html-v0.2.0",
        "sources": [
            {"source_id": "LAW", "content_hash": "b" * 64},
            {"source_id": "DECREE", "content_hash": "c" * 64},
        ],
    }
    audit = {
        "automated_structural_quality": "passed",
        "check_summary": {"passed": 12, "total": 12, "failed": 0},
        "source_manifest_hash": "a" * 64,
        "human_approval": "pending",
    }
    candidate_hash = hashlib.sha256(
        (json.dumps(candidate, ensure_ascii=False, sort_keys=True) + "\n").encode()
    ).hexdigest()
    audit_hash = hashlib.sha256(
        (json.dumps(audit, ensure_ascii=False, sort_keys=True) + "\n").encode()
    ).hexdigest()
    approval = {
        "schema_version": "0.1.0",
        "status": "approved",
        "reviewer_id": "HUMAN-REVIEWER-01",
        "reviewer_role": "independent_legal_reviewer",
        "approved_at": "2026-07-29T21:00:00+09:00",
        "candidate_sha256": candidate_hash,
        "audit_sha256": audit_hash,
        "source_manifest_hash": "a" * 64,
        "parser_version": "official-html-v0.2.0",
        "reviewed_source_ids": ["DECREE", "LAW"],
        "checklist": {
            "source_hashes": True,
            "hierarchy": True,
            "provisos": True,
            "supplementary": True,
            "key_leave_slices": True,
            "deleted_article_tombstones": True,
        },
        "attestation": (
            "공식 원문과 후보의 본문·단서·부칙·핵심 조문을 직접 대조했다."
        ),
    }
    return candidate, audit, approval


def test_human_approval_must_match_candidate_and_audit_hashes() -> None:
    candidate, audit, approval = _payloads()

    validated = validate_candidate_approval(candidate, audit, approval)

    assert validated["reviewer_id"] == "HUMAN-REVIEWER-01"
    assert validated["status"] == "approved"


def test_approval_rejects_automated_reviewer() -> None:
    candidate, audit, approval = _payloads()
    approval["reviewer_id"] = "codex"

    with pytest.raises(ApprovalValidationError, match="human reviewer"):
        validate_candidate_approval(candidate, audit, approval)


def test_approval_rejects_hash_drift_and_incomplete_checklist() -> None:
    candidate, audit, approval = _payloads()
    approval["candidate_sha256"] = "0" * 64
    approval["checklist"]["provisos"] = False

    with pytest.raises(ApprovalValidationError):
        validate_candidate_approval(candidate, audit, approval)
