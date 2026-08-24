import hashlib
import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import insaon.adapters.source.quality as quality
from insaon.adapters.source import OfficialHtmlProvisionParser, audit_legal_candidate
from insaon.domain import RawSnapshot


def _fixture(tmp_path: Path) -> tuple[dict[str, Any], dict[str, Any], Path]:
    content = (
        '<p class="pty1_p4"><label>제1조(휴직)</label>'
        "질병 육아 돌봄 자기개발 검토</p>"
    )
    encoded = content.encode()
    digest = hashlib.sha256(encoded).hexdigest()
    relative_path = f"LAW/{digest}.html"
    raw_path = tmp_path / relative_path
    raw_path.parent.mkdir()
    raw_path.write_bytes(encoded)
    entry: dict[str, Any] = {
        "snapshot_id": "SNAP-LAW",
        "source_id": "LAW",
        "source_name": "법",
        "source_type": "law",
        "issuer": "official",
        "official_source_id": "id:1",
        "source_url": "https://example.test/law",
        "retrieved_at": "2026-07-29T00:00:00+00:00",
        "content_type": "text/html",
        "content_hash": digest,
        "byte_count": len(encoded),
        "promulgation_date": "2026-07-01",
        "effective_from": "2026-07-01",
        "effective_to": None,
        "collector_version": "test",
        "relative_path": relative_path,
    }
    snapshot = RawSnapshot(
        snapshot_id="SNAP-LAW",
        source_id="LAW",
        official_source_id="id:1",
        source_url="https://example.test/law",
        content=content,
        content_type="text/html",
        content_hash=digest,
        retrieved_at=datetime(2026, 7, 29, tzinfo=UTC),
        promulgation_date=date(2026, 7, 1),
        effective_from=date(2026, 7, 1),
        parser_version=OfficialHtmlProvisionParser.parser_version,
    )
    parsed = OfficialHtmlProvisionParser().parse(snapshot)
    sources = [{field: entry[field] for field in quality._SOURCE_FIELDS}]
    source_manifest_hash = hashlib.sha256(
        json.dumps(sources, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    candidate = {
        "schema_version": "0.1.0",
        "candidate_status": "pending_human_approval",
        "source_manifest_hash": source_manifest_hash,
        "parser_version": OfficialHtmlProvisionParser.parser_version,
        "sources": sources,
        "provision_count": len(parsed.provisions),
        "supplementary_count": 0,
        "quality": {
            "fatal_count": 0,
            "warning_count": 0,
            "informational_count": 0,
            "issue_counts": {},
            "issues": [],
        },
        "provisions": [
            quality._provision_json(provision) for provision in parsed.provisions
        ],
    }
    return candidate, {"snapshots": [entry]}, tmp_path


def test_audit_passes_deterministic_candidate(
    tmp_path: Path,
    monkeypatch: Any,
) -> None:
    candidate, manifest, raw_root = _fixture(tmp_path)
    monkeypatch.setattr(
        quality,
        "_KEY_SLICES",
        (("LAW", "제1조", ("질병",), False),),
    )

    result = audit_legal_candidate(candidate, manifest, raw_root)

    assert result["automated_structural_quality"] == "passed"
    assert result["check_summary"] == {"passed": 12, "total": 12, "failed": 0}
    assert result["legal_content_accuracy"] == "unmeasured"
    assert result["human_approval"] == "pending"


def test_audit_fails_when_raw_snapshot_is_tampered(
    tmp_path: Path,
    monkeypatch: Any,
) -> None:
    candidate, manifest, raw_root = _fixture(tmp_path)
    monkeypatch.setattr(
        quality,
        "_KEY_SLICES",
        (("LAW", "제1조", ("질병",), False),),
    )
    relative_path = manifest["snapshots"][0]["relative_path"]
    (raw_root / relative_path).write_text("tampered", encoding="utf-8")

    result = audit_legal_candidate(candidate, manifest, raw_root)

    source_check = next(
        check
        for check in result["checks"]
        if check["check_id"] == "source_snapshot_integrity"
    )
    assert source_check["passed"] is False
    assert result["automated_structural_quality"] == "failed"
