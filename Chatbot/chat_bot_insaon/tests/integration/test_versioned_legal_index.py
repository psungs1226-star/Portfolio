import hashlib
import json
from typing import Any

import pytest

from insaon.adapters.source.indexing import (
    LegalIndexBuildError,
    build_versioned_legal_index,
    validate_legal_index_manifest,
)


def _approved_inputs() -> tuple[
    dict[str, Any],
    dict[str, Any],
    dict[str, Any],
    dict[str, list[float]],
]:
    provisions = [
        {
            "provision_id": "LAW:article:63",
            "source_id": "LAW",
            "article_path": "제63조",
            "title": "휴직",
            "text": "질병휴직과 육아휴직",
            "proviso_text": None,
            "parent_provision_id": None,
            "effective_from": "2026-01-01",
            "effective_to": None,
            "applies_to": ["local_general_service"],
            "topic_tags": ["medical_leave", "parental_leave"],
            "relation_ids": [],
            "source_hash": "b" * 64,
        }
    ]
    candidate = {
        "candidate_status": "pending_human_approval",
        "source_manifest_hash": "a" * 64,
        "parser_version": "official-html-v0.2.0",
        "sources": [{"source_id": "LAW", "content_hash": "b" * 64}],
        "provision_count": 1,
        "provisions": provisions,
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
        "reviewer_id": "HUMAN-01",
        "reviewer_role": "independent_legal_reviewer",
        "approved_at": "2026-07-29T21:00:00+09:00",
        "candidate_sha256": candidate_hash,
        "audit_sha256": audit_hash,
        "source_manifest_hash": "a" * 64,
        "parser_version": "official-html-v0.2.0",
        "reviewed_source_ids": ["LAW"],
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
    return candidate, audit, approval, {"LAW:article:63": [0.1, 0.2, 0.3]}


def test_index_requires_human_approval_and_complete_embedding_set() -> None:
    candidate, audit, approval, embeddings = _approved_inputs()

    manifest, documents = build_versioned_legal_index(
        candidate,
        audit,
        approval,
        embeddings,
        embedding_dimensions=3,
    )

    validate_legal_index_manifest(manifest, documents, embeddings)
    assert manifest["status"] == "approved_legal_index"
    assert manifest["provision_count"] == 1
    assert manifest["source_manifest_hash"] == "a" * 64


def test_index_rejects_missing_embedding() -> None:
    candidate, audit, approval, _ = _approved_inputs()

    with pytest.raises(LegalIndexBuildError, match="embedding set"):
        build_versioned_legal_index(
            candidate,
            audit,
            approval,
            {},
            embedding_dimensions=3,
        )
