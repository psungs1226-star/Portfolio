from __future__ import annotations

import json
from pathlib import Path

import pytest

from insaon.adapters.source import CandidateCorpusError, CandidateEvidenceCorpus


def _source(source_id: str, source_name: str, topic: str) -> str:
    return f'''
[[sources]]
source_id = "{source_id}"
source_name = "{source_name}"
source_type = "law"
issuer = "법제처 국가법령정보센터"
official_source_id = "test:{source_id}"
url = "https://www.law.go.kr/LSW/{source_id}"
allowed_host = "www.law.go.kr"
content_types = ["text/html"]
max_bytes = 1000
timeout_seconds = 1
retries = 0
auth_mode = "none"
expected_marker = "{source_name}"
promulgation_date = "2026-01-01"
effective_from = "2026-01-01"
redistribution = "private_snapshot_public_metadata_only"
collector_format = "html"
topic_domains = ["{topic}"]
review_tier = "evidence_only"
'''


def test_candidate_rejects_registry_source_without_searchable_provisions(
    tmp_path: Path,
) -> None:
    registry = tmp_path / "registry.toml"
    registry.write_text(
        'schema_version = "0.2.0"\n'
        + _source("SOURCE-A", "임용 규정", "appointment")
        + _source("SOURCE-B", "징계 규정", "discipline_and_appeal"),
        encoding="utf-8",
    )
    candidate = tmp_path / "candidate.json"
    candidate.write_text(
        json.dumps(
            {
                "candidate_status": "pending_human_approval",
                "quality": {"fatal_count": 0},
                "created_at": "2026-08-04T00:00:00+09:00",
                "sources": [
                    {
                        "source_id": "SOURCE-A",
                        "source_url": "https://www.law.go.kr/LSW/SOURCE-A",
                    },
                    {
                        "source_id": "SOURCE-B",
                        "source_url": "https://www.law.go.kr/LSW/SOURCE-B",
                    },
                ],
                "provision_count": 1,
                "provisions": [
                    {
                        "provision_id": "SOURCE-A:article:1",
                        "source_id": "SOURCE-A",
                        "article_path": "제1조",
                        "title": "목적",
                        "text": "임용 기준을 정한다.",
                        "effective_from": "2026-01-01",
                        "effective_to": None,
                        "applies_to": ["local_general_service"],
                        "topic_tags": [],
                        "parent_provision_id": None,
                        "proviso_text": None,
                        "relation_ids": [],
                        "source_hash": "a" * 64,
                    }
                ],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    with pytest.raises(
        CandidateCorpusError,
        match="candidate has no searchable provisions.*SOURCE-B",
    ):
        CandidateEvidenceCorpus.from_files(candidate, registry)
