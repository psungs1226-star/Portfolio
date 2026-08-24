from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any

from insaon.adapters.source.parser import OfficialHtmlProvisionParser
from insaon.domain import Provision, RawSnapshot

_SOURCE_FIELDS = (
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

_KEY_SLICES = (
    ("LAW-LOCAL-OFFICIAL", "제63조 제1항 제1호", ("장기요양",), False),
    ("LAW-LOCAL-OFFICIAL", "제63조 제2항 제4호", ("자녀",), False),
    ("LAW-LOCAL-OFFICIAL", "제63조 제2항 제5호", ("돌보기",), False),
    ("LAW-LOCAL-OFFICIAL", "제63조 제2항 제7호", ("자기개발",), False),
    ("LAW-LOCAL-OFFICIAL", "제64조 제1호", ("1년 이내",), True),
    ("LAW-LOCAL-OFFICIAL", "제64조 제8호", ("3년 이내",), False),
    ("LAW-LOCAL-OFFICIAL", "제64조 제9호", ("총 3년",), False),
    ("LAW-LOCAL-OFFICIAL", "제64조 제10호", ("1년 이내",), False),
    ("DECREE-LOCAL-APPOINTMENT-OFFICIAL", "제2조 제2호", ("복직",), False),
    (
        "DECREE-LOCAL-APPOINTMENT-OFFICIAL",
        "제27조의3 제5항 제1호",
        ("질병휴직",),
        False,
    ),
    (
        "DECREE-LOCAL-APPOINTMENT-OFFICIAL",
        "제27조의3 제5항 제2호",
        ("육아휴직",),
        False,
    ),
    (
        "DECREE-LOCAL-APPOINTMENT-OFFICIAL",
        "제31조의6 제2항 제1호 다목",
        ("육아휴직",),
        True,
    ),
    ("RULE-LOCAL-HR-GUIDE-OFFICIAL", "제70조 제1항", ("질병휴직",), False),
    ("RULE-LOCAL-HR-GUIDE-OFFICIAL", "제76조 제1항", ("육아휴직",), False),
    ("RULE-LOCAL-HR-GUIDE-OFFICIAL", "제77조 제1항", ("돌봄대상자",), False),
    (
        "RULE-LOCAL-HR-GUIDE-OFFICIAL",
        "제78조 제1항 제1호",
        ("자기개발",),
        False,
    ),
)

_REQUIRED_TOPICS = (
    "medical_leave",
    "parental_leave",
    "family_care_leave",
    "self_development_leave",
)


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


def _raw_snapshot(raw_root: Path, item: dict[str, Any]) -> RawSnapshot:
    return RawSnapshot(
        snapshot_id=str(item["snapshot_id"]),
        source_id=str(item["source_id"]),
        official_source_id=str(item["official_source_id"]),
        source_url=str(item["source_url"]),
        content=(raw_root / str(item["relative_path"])).read_text(encoding="utf-8"),
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


def _check(check_id: str, passed: bool, observed: Any) -> dict[str, Any]:
    return {"check_id": check_id, "passed": passed, "observed": observed}


def audit_legal_candidate(
    candidate: dict[str, Any],
    raw_manifest: dict[str, Any],
    raw_root: Path,
) -> dict[str, Any]:
    """Run deterministic source-to-candidate checks without claiming legal correctness."""
    checks: list[dict[str, Any]] = []
    manifest_entries = {
        str(item["snapshot_id"]): item for item in raw_manifest.get("snapshots", [])
    }
    reparsed_provisions: list[dict[str, Any]] = []
    reparsed_issues: list[dict[str, Any]] = []
    selected_entries: list[dict[str, Any]] = []
    source_file_results: list[dict[str, Any]] = []
    html_parser = OfficialHtmlProvisionParser()

    for source in candidate.get("sources", []):
        snapshot_id = str(source.get("snapshot_id"))
        entry = manifest_entries.get(snapshot_id)
        metadata_match = entry is not None and all(
            source.get(field) == entry.get(field) for field in _SOURCE_FIELDS
        )
        exists = False
        hash_match = False
        byte_count_match = False
        if entry is not None:
            selected_entries.append(entry)
            raw_path = raw_root / str(entry["relative_path"])
            exists = raw_path.is_file()
            if exists:
                content = raw_path.read_bytes()
                hash_match = hashlib.sha256(content).hexdigest() == entry["content_hash"]
                byte_count_match = len(content) == entry["byte_count"]
                parsed = html_parser.parse(_raw_snapshot(raw_root, entry))
                reparsed_provisions.extend(
                    _provision_json(provision) for provision in parsed.provisions
                )
                reparsed_issues.extend(
                    {
                        "source_id": parsed.snapshot.source_id,
                        "code": issue.code,
                        "message": issue.message,
                        "fatal": issue.fatal,
                    }
                    for issue in parsed.quality_issues
                )
        source_file_results.append(
            {
                "source_id": source.get("source_id"),
                "snapshot_id": snapshot_id,
                "metadata_match": metadata_match,
                "file_exists": exists,
                "hash_match": hash_match,
                "byte_count_match": byte_count_match,
            }
        )

    checks.append(
        _check(
            "source_snapshot_integrity",
            bool(source_file_results)
            and all(
                result["metadata_match"]
                and result["file_exists"]
                and result["hash_match"]
                and result["byte_count_match"]
                for result in source_file_results
            ),
            source_file_results,
        )
    )
    canonical_sources = [
        {field: entry.get(field) for field in _SOURCE_FIELDS}
        for entry in selected_entries
    ]
    calculated_manifest_hash = hashlib.sha256(
        json.dumps(canonical_sources, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    checks.append(
        _check(
            "selected_source_manifest_hash",
            calculated_manifest_hash == candidate.get("source_manifest_hash"),
            calculated_manifest_hash,
        )
    )

    candidate_provisions = candidate.get("provisions", [])
    checks.append(
        _check(
            "deterministic_reparse_equivalence",
            reparsed_provisions == candidate_provisions,
            {
                "reparsed": len(reparsed_provisions),
                "candidate": len(candidate_provisions),
            },
        )
    )
    checks.append(
        _check(
            "parser_issue_reproducibility",
            reparsed_issues == candidate.get("quality", {}).get("issues", []),
            dict(Counter(issue["code"] for issue in reparsed_issues)),
        )
    )
    active_unparsed = sum(
        issue["code"] == "UNPARSED_ARTICLE" for issue in reparsed_issues
    )
    tombstones = sum(
        issue["code"] == "DELETED_ARTICLE_TOMBSTONE"
        for issue in reparsed_issues
    )
    fatal_issues = sum(bool(issue["fatal"]) for issue in reparsed_issues)
    checks.append(
        _check(
            "article_header_coverage",
            active_unparsed == 0 and fatal_issues == 0,
            {
                "active_unparsed": active_unparsed,
                "fatal": fatal_issues,
                "deleted_article_tombstones": tombstones,
            },
        )
    )
    actual_issue_counts = dict(Counter(issue["code"] for issue in reparsed_issues))
    candidate_quality = candidate.get("quality", {})
    reported_issue_counts = candidate_quality.get("issue_counts", {})
    checks.append(
        _check(
            "candidate_quality_count_contract",
            candidate_quality.get("fatal_count") == fatal_issues
            and candidate_quality.get("warning_count") == active_unparsed
            and candidate_quality.get("informational_count") == tombstones
            and reported_issue_counts == actual_issue_counts,
            {
                "reported": {
                    "fatal": candidate_quality.get("fatal_count"),
                    "warning": candidate_quality.get("warning_count"),
                    "informational": candidate_quality.get("informational_count"),
                    "issue_counts": reported_issue_counts,
                },
                "actual": {
                    "fatal": fatal_issues,
                    "warning": active_unparsed,
                    "informational": tombstones,
                    "issue_counts": actual_issue_counts,
                },
            },
        )
    )

    provision_ids = [str(item.get("provision_id")) for item in candidate_provisions]
    known_ids = set(provision_ids)
    duplicate_count = len(provision_ids) - len(known_ids)
    orphan_count = sum(
        item.get("parent_provision_id") is not None
        and item.get("parent_provision_id") not in known_ids
        for item in candidate_provisions
    )
    empty_text_count = sum(
        not isinstance(item.get("text"), str) or not str(item["text"]).strip()
        for item in candidate_provisions
    )
    invalid_validity_count = 0
    for item in candidate_provisions:
        try:
            start = date.fromisoformat(str(item["effective_from"]))
            end_value = item.get("effective_to")
            if end_value is not None and date.fromisoformat(str(end_value)) <= start:
                invalid_validity_count += 1
        except (KeyError, TypeError, ValueError):
            invalid_validity_count += 1
    checks.append(
        _check(
            "tree_integrity",
            duplicate_count == orphan_count == empty_text_count == invalid_validity_count == 0,
            {
                "duplicates": duplicate_count,
                "orphans": orphan_count,
                "empty_text": empty_text_count,
                "invalid_validity": invalid_validity_count,
            },
        )
    )

    unresolved_relations = sum(
        relation_id not in known_ids
        for item in candidate_provisions
        for relation_id in item.get("relation_ids", [])
    )
    checks.append(
        _check(
            "relation_target_integrity",
            unresolved_relations == 0,
            {"unresolved_relations": unresolved_relations},
        )
    )
    proviso_mismatches = 0
    proviso_count = 0
    for item in candidate_provisions:
        text = str(item.get("text", ""))
        index = text.find("다만,")
        expected = text[index:] if index >= 0 else None
        if expected is not None:
            proviso_count += 1
        if item.get("proviso_text") != expected:
            proviso_mismatches += 1
    checks.append(
        _check(
            "proviso_extraction_integrity",
            proviso_mismatches == 0,
            {"provisos": proviso_count, "mismatches": proviso_mismatches},
        )
    )

    by_source_path = {
        (str(item.get("source_id")), str(item.get("article_path"))): item
        for item in candidate_provisions
    }
    slice_results: list[dict[str, Any]] = []
    for source_id, article_path, markers, requires_proviso in _KEY_SLICES:
        provision = by_source_path.get((source_id, article_path))
        passed = (
            provision is not None
            and all(marker in str(provision.get("text", "")) for marker in markers)
            and (
                not requires_proviso
                or str(provision.get("proviso_text") or "").startswith("다만,")
            )
        )
        slice_results.append(
            {
                "source_id": source_id,
                "article_path": article_path,
                "markers": list(markers),
                "requires_proviso": requires_proviso,
                "passed": passed,
            }
        )
    checks.append(
        _check(
            "key_leave_slice_presence",
            all(result["passed"] for result in slice_results),
            slice_results,
        )
    )

    topic_counts = Counter(
        str(topic)
        for item in candidate_provisions
        for topic in item.get("topic_tags", [])
    )
    checks.append(
        _check(
            "required_topic_coverage",
            all(topic_counts[topic] > 0 for topic in _REQUIRED_TOPICS),
            {topic: topic_counts[topic] for topic in _REQUIRED_TOPICS},
        )
    )
    supplementary_count = sum(
        "supplementary" in item.get("topic_tags", [])
        for item in candidate_provisions
    )
    checks.append(
        _check(
            "candidate_count_contract",
            len(candidate_provisions) == candidate.get("provision_count")
            and supplementary_count == candidate.get("supplementary_count"),
            {
                "provisions": len(candidate_provisions),
                "supplementary": supplementary_count,
            },
        )
    )

    passed_count = sum(bool(check["passed"]) for check in checks)
    return {
        "schema_version": "0.1.0",
        "profile": "official-corpus-automated-quality-audit",
        "candidate_status": candidate.get("candidate_status"),
        "source_manifest_hash": candidate.get("source_manifest_hash"),
        "parser_version": candidate.get("parser_version"),
        "automated_structural_quality": (
            "passed" if passed_count == len(checks) else "failed"
        ),
        "check_summary": {
            "passed": passed_count,
            "total": len(checks),
            "failed": len(checks) - passed_count,
        },
        "quality_counts": {
            "fatal": fatal_issues,
            "warning": active_unparsed,
            "deleted_article_tombstones": tombstones,
            "provisions": len(candidate_provisions),
            "supplementary": supplementary_count,
        },
        "checks": checks,
        "legal_content_accuracy": "unmeasured",
        "human_approval": "pending",
        "release_status": "hold",
        "limitations": [
            "Automated checks establish file, parser and structural consistency only.",
            "They do not establish legal interpretation, completeness or current-law guarantees.",
            "Independent human source comparison is required before index promotion.",
        ],
    }
