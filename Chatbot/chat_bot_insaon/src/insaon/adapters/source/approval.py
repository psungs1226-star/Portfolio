from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any

_REQUIRED_ATTESTATION = (
    "공식 원문과 후보의 본문·단서·부칙·핵심 조문을 직접 대조했다."
)
_REQUIRED_CHECKS = {
    "source_hashes",
    "hierarchy",
    "provisos",
    "supplementary",
    "key_leave_slices",
    "deleted_article_tombstones",
}
_AUTOMATED_REVIEWERS = {
    "ai",
    "automation",
    "chatgpt",
    "claude",
    "codex",
    "llm",
    "model",
    "system",
}


class ApprovalValidationError(ValueError):
    pass


def canonical_sha256(payload: dict[str, Any]) -> str:
    encoded = (
        json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n"
    ).encode()
    return hashlib.sha256(encoded).hexdigest()


def validate_candidate_approval(
    candidate: dict[str, Any],
    audit: dict[str, Any],
    approval: dict[str, Any],
) -> dict[str, Any]:
    """Validate a separately created human attestation against immutable hashes."""
    errors: list[str] = []
    if approval.get("schema_version") != "0.1.0":
        errors.append("unsupported approval schema")
    if approval.get("status") != "approved":
        errors.append("approval status must be approved")
    reviewer_id = str(approval.get("reviewer_id", "")).strip()
    if not reviewer_id or reviewer_id.casefold() in _AUTOMATED_REVIEWERS:
        errors.append("a distinct human reviewer is required")
    if approval.get("reviewer_role") != "independent_legal_reviewer":
        errors.append("reviewer role must be independent_legal_reviewer")
    try:
        datetime.fromisoformat(str(approval["approved_at"]))
    except (KeyError, ValueError):
        errors.append("approved_at must be an RFC3339 timestamp")

    if audit.get("automated_structural_quality") != "passed":
        errors.append("automated audit must pass")
    summary = audit.get("check_summary", {})
    if summary.get("failed") != 0 or summary.get("passed") != summary.get("total"):
        errors.append("all automated audit checks must pass")
    if candidate.get("source_manifest_hash") != audit.get("source_manifest_hash"):
        errors.append("candidate and audit source manifest hashes differ")
    if approval.get("candidate_sha256") != canonical_sha256(candidate):
        errors.append("candidate hash mismatch")
    if approval.get("audit_sha256") != canonical_sha256(audit):
        errors.append("audit hash mismatch")
    if approval.get("source_manifest_hash") != candidate.get("source_manifest_hash"):
        errors.append("approved source manifest hash mismatch")
    if approval.get("parser_version") != candidate.get("parser_version"):
        errors.append("approved parser version mismatch")

    expected_sources = sorted(
        str(source["source_id"]) for source in candidate.get("sources", [])
    )
    if approval.get("reviewed_source_ids") != expected_sources:
        errors.append("reviewed source IDs must exactly match candidate sources")
    checklist = approval.get("checklist")
    if not isinstance(checklist, dict):
        errors.append("approval checklist is required")
    elif set(checklist) != _REQUIRED_CHECKS or not all(
        checklist.get(key) is True for key in _REQUIRED_CHECKS
    ):
        errors.append("every required review checklist item must be true")
    if approval.get("attestation") != _REQUIRED_ATTESTATION:
        errors.append("human source-comparison attestation is required")
    if errors:
        raise ApprovalValidationError("; ".join(errors))
    return approval


def approval_template(
    candidate: dict[str, Any],
    audit: dict[str, Any],
) -> dict[str, Any]:
    return {
        "schema_version": "0.1.0",
        "status": "pending",
        "reviewer_id": None,
        "reviewer_role": "independent_legal_reviewer",
        "approved_at": None,
        "candidate_sha256": canonical_sha256(candidate),
        "audit_sha256": canonical_sha256(audit),
        "source_manifest_hash": candidate.get("source_manifest_hash"),
        "parser_version": candidate.get("parser_version"),
        "reviewed_source_ids": sorted(
            str(source["source_id"]) for source in candidate.get("sources", [])
        ),
        "checklist": {key: False for key in sorted(_REQUIRED_CHECKS)},
        "attestation": None,
        "required_attestation": _REQUIRED_ATTESTATION,
    }

