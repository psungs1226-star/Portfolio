#!/usr/bin/env python3
"""Build a semantic promotion candidate; never self-approve official law."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import asdict
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from insaon.adapters.source import (
    OfficialHtmlProvisionParser,
    OfficialSourceRegistry,
)
from insaon.domain import ParsedDocument, Provision, RawSnapshot

ROOT = Path(__file__).resolve().parent.parent


def _provision_json(provision: Provision) -> dict[str, Any]:
    return {
        "provision_id": provision.provision_id,
        "source_id": provision.source_id,
        "article_path": provision.article_path,
        "title": provision.title,
        "text": provision.text,
        "proviso_text": provision.proviso_text,
        "parent_provision_id": provision.parent_provision_id,
        "effective_from": provision.valid_time.start.isoformat(),
        "effective_to": (
            provision.valid_time.end.isoformat()
            if provision.valid_time.end is not None
            else None
        ),
        "applies_to": sorted(provision.applies_to),
        "topic_tags": sorted(provision.topic_tags),
        "relation_ids": list(provision.relation_ids),
        "source_hash": provision.source_hash,
    }


def _raw_snapshot(root: Path, item: dict[str, Any]) -> RawSnapshot:
    return RawSnapshot(
        snapshot_id=str(item["snapshot_id"]),
        source_id=str(item["source_id"]),
        official_source_id=str(item["official_source_id"]),
        source_url=str(item["source_url"]),
        content=(root / str(item["relative_path"])).read_text(encoding="utf-8"),
        content_type=str(item["content_type"]),
        content_hash=str(item["content_hash"]),
        retrieved_at=datetime.fromisoformat(str(item["retrieved_at"])),
        promulgation_date=date.fromisoformat(str(item["promulgation_date"])),
        effective_from=date.fromisoformat(str(item["effective_from"])),
        parser_version=OfficialHtmlProvisionParser.parser_version,
        effective_to=(
            date.fromisoformat(str(item["effective_to"]))
            if item.get("effective_to") is not None
            else None
        ),
    )


def _current_entries(
    raw_manifest: dict[str, Any],
    registry: OfficialSourceRegistry,
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for source in registry.sources:
        if source.source_type == "manual":
            continue
        matches = [
            item
            for item in raw_manifest["snapshots"]
            if item.get("source_id") == source.source_id
            and item.get("source_url") == source.url
        ]
        if not matches:
            raise ValueError(f"current official snapshot is missing: {source.source_id}")
        selected.append(max(matches, key=lambda item: str(item["retrieved_at"])))
    return selected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--config", type=Path, default=Path("configs/sources/official-mvp.toml"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--dry-run", action="store_true", required=True)
    args = parser.parse_args()
    manifest_path = args.manifest.resolve()
    raw_root = manifest_path.parent
    config_path = args.config if args.config.is_absolute() else ROOT / args.config
    registry = OfficialSourceRegistry.from_toml(config_path)
    raw_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    entries = _current_entries(raw_manifest, registry)
    parsed_documents: list[ParsedDocument] = []
    html_parser = OfficialHtmlProvisionParser()
    for entry in entries:
        parsed_documents.append(html_parser.parse(_raw_snapshot(raw_root, entry)))

    provisions = [
        _provision_json(provision)
        for document in parsed_documents
        for provision in document.provisions
    ]
    issues = [
        {
            "source_id": document.snapshot.source_id,
            **asdict(issue),
        }
        for document in parsed_documents
        for issue in document.quality_issues
    ]
    informational_codes = {"DELETED_ARTICLE_TOMBSTONE"}
    issue_counts: dict[str, int] = {}
    for issue in issues:
        code = str(issue["code"])
        issue_counts[code] = issue_counts.get(code, 0) + 1
    canonical_sources = [
        {
            key: entry.get(key)
            for key in (
                "snapshot_id",
                "source_id",
                "official_source_id",
                "source_url",
                "content_hash",
                "retrieved_at",
                "promulgation_date",
                "effective_from",
                "effective_to",
                "collector_version",
            )
        }
        for entry in entries
    ]
    source_manifest_hash = hashlib.sha256(
        json.dumps(canonical_sources, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    payload = {
        "schema_version": "0.1.0",
        "candidate_status": "pending_human_approval",
        "created_at": datetime.now(UTC).isoformat(),
        "source_manifest_hash": source_manifest_hash,
        "parser_version": html_parser.parser_version,
        "sources": canonical_sources,
        "provision_count": len(provisions),
        "supplementary_count": sum(
            len(document.supplementary_ids) for document in parsed_documents
        ),
        "quality": {
            "fatal_count": sum(1 for issue in issues if issue["fatal"]),
            "warning_count": sum(
                1
                for issue in issues
                if not issue["fatal"] and issue["code"] not in informational_codes
            ),
            "informational_count": sum(
                1 for issue in issues if issue["code"] in informational_codes
            ),
            "issue_counts": issue_counts,
            "issues": issues,
        },
        "approval": {
            "status": "pending",
            "reviewer_id": None,
            "approved_at": None,
            "approved_source_manifest_hash": None,
        },
        "provisions": provisions,
        "limitations": [
            "Parser output is a candidate, not an approved legal index.",
            "A human reviewer must compare source hashes, legal hierarchy, provisos and supplements.",
            "The public manual remains metadata-only until its PDF redistribution and parsing are reviewed.",
        ],
    }
    output = (
        args.output.resolve()
        if args.output is not None
        else manifest_path.parent.parent / "processed/candidate.json"
    )
    if ROOT == output or ROOT in output.parents:
        raise ValueError("processed official corpus must stay outside the public submission")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Promotion dry-run: {len(provisions)} provisions, "
        f"{payload['quality']['fatal_count']} fatal issue(s), "
        f"{payload['quality']['warning_count']} warning(s), "
        f"{payload['quality']['informational_count']} informational issue(s), "
        f"approval=pending, output={output}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
