from typing import Any

from insaon.adapters.source import diff_legal_candidates


def _candidate(text: str, *, include_second: bool = False) -> dict[str, Any]:
    provisions = [
        {
            "provision_id": "LAW:1",
            "source_id": "LAW",
            "article_path": "제1조",
            "title": "목적",
            "text": text,
            "proviso_text": None,
            "parent_provision_id": None,
            "effective_from": "2026-01-01",
            "effective_to": None,
            "applies_to": [],
            "topic_tags": [],
            "relation_ids": [],
            "source_hash": "a" * 64,
        }
    ]
    if include_second:
        provisions.append({**provisions[0], "provision_id": "LAW:2"})
    return {"source_manifest_hash": "b" * 64, "provisions": provisions}


def test_initial_candidate_marks_every_provision_added() -> None:
    result = diff_legal_candidates(None, _candidate("본문", include_second=True))

    assert result["baseline_status"] == "initial_candidate"
    assert result["summary"]["added"] == 2
    assert result["summary"]["changed"] == 0


def test_candidate_diff_detects_content_change_and_addition() -> None:
    result = diff_legal_candidates(
        _candidate("이전"),
        _candidate("변경", include_second=True),
    )

    assert result["summary"] == {
        "previous": 1,
        "current": 2,
        "added": 1,
        "removed": 0,
        "changed": 1,
        "unchanged": 0,
    }
