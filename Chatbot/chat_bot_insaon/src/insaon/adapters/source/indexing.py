from __future__ import annotations

import hashlib
import json
from typing import Any

from insaon.adapters.source.approval import (
    ApprovalValidationError,
    canonical_sha256,
    validate_candidate_approval,
)


class LegalIndexBuildError(ValueError):
    pass


def _ngrams(text: str, size: int = 2) -> list[str]:
    compact = "".join(text.casefold().split())
    return sorted({compact[index : index + size] for index in range(len(compact) - size + 1)})


def _documents(candidate: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "provision_id": item["provision_id"],
            "source_id": item["source_id"],
            "article_path": item["article_path"],
            "title": item["title"],
            "text": item["text"],
            "proviso_text": item.get("proviso_text"),
            "parent_provision_id": item.get("parent_provision_id"),
            "effective_from": item["effective_from"],
            "effective_to": item.get("effective_to"),
            "applies_to": item["applies_to"],
            "topic_tags": item["topic_tags"],
            "relation_ids": item["relation_ids"],
            "source_hash": item["source_hash"],
            "lexical_terms": _ngrams(
                f"{item['article_path']} {item['title']} {item['text']}"
            ),
        }
        for item in candidate.get("provisions", [])
    ]


def _embedding_hash(embeddings: dict[str, list[float]]) -> str:
    return hashlib.sha256(
        (json.dumps(embeddings, sort_keys=True, separators=(",", ":")) + "\n").encode()
    ).hexdigest()


def build_versioned_legal_index(
    candidate: dict[str, Any],
    audit: dict[str, Any],
    approval: dict[str, Any],
    embeddings: dict[str, list[float]],
    *,
    embedding_dimensions: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    try:
        validate_candidate_approval(candidate, audit, approval)
    except ApprovalValidationError as exc:
        raise LegalIndexBuildError(str(exc)) from exc
    documents = _documents(candidate)
    provision_ids = {str(item["provision_id"]) for item in documents}
    if set(embeddings) != provision_ids:
        raise LegalIndexBuildError("embedding set must exactly match candidate provisions")
    if embedding_dimensions <= 0 or any(
        len(vector) != embedding_dimensions for vector in embeddings.values()
    ):
        raise LegalIndexBuildError("embedding dimensions do not match index contract")

    document_set_hash = hashlib.sha256(
        (
            "\n".join(
                json.dumps(item, ensure_ascii=False, sort_keys=True)
                for item in documents
            )
            + "\n"
        ).encode()
    ).hexdigest()
    candidate_hash = canonical_sha256(candidate)
    approval_hash = canonical_sha256(approval)
    embedding_hash = _embedding_hash(embeddings)
    version_seed = (
        f"{candidate['source_manifest_hash']}:{candidate_hash}:"
        f"{approval_hash}:{document_set_hash}:{embedding_hash}"
    )
    version_hash = hashlib.sha256(version_seed.encode()).hexdigest()
    manifest = {
        "schema_version": "0.1.0",
        "status": "approved_legal_index",
        "version_id": f"LEGAL-IDX-{version_hash[:16]}",
        "source_manifest_hash": candidate["source_manifest_hash"],
        "candidate_sha256": candidate_hash,
        "approval_sha256": approval_hash,
        "audit_sha256": canonical_sha256(audit),
        "parser_version": candidate["parser_version"],
        "lexical_implementation": "char-ngram-v1",
        "embedding": {
            "provider": "ollama-local",
            "model": "bge-m3:latest",
            "version": "embedding-v2-local",
            "dimensions": embedding_dimensions,
            "artifact_sha256": embedding_hash,
        },
        "reranker": {
            "provider": "ollama-local",
            "model": "qwen3:4b-instruct",
            "version": "reranker-v2-local",
        },
        "provision_count": len(documents),
        "source_count": len(candidate.get("sources", [])),
        "document_set_sha256": document_set_hash,
        "source_hashes": {
            str(source["source_id"]): str(source["content_hash"])
            for source in candidate.get("sources", [])
        },
    }
    validate_legal_index_manifest(manifest, documents, embeddings)
    return manifest, documents


def validate_legal_index_manifest(
    manifest: dict[str, Any],
    documents: list[dict[str, Any]],
    embeddings: dict[str, list[float]],
) -> None:
    errors: list[str] = []
    if manifest.get("status") != "approved_legal_index":
        errors.append("index status is not approved")
    if manifest.get("provision_count") != len(documents):
        errors.append("provision count mismatch")
    document_ids = [str(item.get("provision_id")) for item in documents]
    if len(document_ids) != len(set(document_ids)):
        errors.append("duplicate provision IDs")
    if set(document_ids) != set(embeddings):
        errors.append("embedding IDs differ from document IDs")
    dimensions = manifest.get("embedding", {}).get("dimensions")
    if not isinstance(dimensions, int) or any(
        len(vector) != dimensions for vector in embeddings.values()
    ):
        errors.append("embedding dimension mismatch")
    if manifest.get("embedding", {}).get("artifact_sha256") != _embedding_hash(
        embeddings
    ):
        errors.append("embedding artifact hash mismatch")
    if errors:
        raise LegalIndexBuildError("; ".join(errors))

