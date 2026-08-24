from __future__ import annotations

import hashlib
import json
from datetime import UTC, date, datetime

import pytest

from insaon.domain import RawSnapshot


@pytest.fixture
def semantic_snapshot() -> RawSnapshot:
    payload = {
        "provisions": [
            {
                "provision_id": "SYNTH-ARTICLE-1",
                "article_path": "합성 제1조",
                "title": "합성 질병휴직 검토자료",
                "text": "[합성] 질병휴직 검토 시 공개 근거와 기준일을 확인한다.",
                "effective_from": "2024-01-01",
                "effective_to": None,
                "applies_to": ["local_general_service"],
                "topic_tags": ["medical_leave"],
                "relation_ids": ["SYNTH-PROVISO-1", "SYNTH-SUPPLEMENT-1"],
            },
            {
                "provision_id": "SYNTH-PROVISO-1",
                "parent_provision_id": "SYNTH-ARTICLE-1",
                "article_path": "합성 제1조 단서",
                "title": "합성 단서",
                "text": "[합성] 기관 규정이 필요한 경우 담당자 검토로 전환한다.",
                "effective_from": "2024-01-01",
                "effective_to": None,
                "applies_to": ["local_general_service"],
                "topic_tags": ["medical_leave", "proviso"],
                "relation_ids": [],
            },
            {
                "provision_id": "SYNTH-SUPPLEMENT-1",
                "parent_provision_id": "SYNTH-ARTICLE-1",
                "article_path": "합성 부칙 제1조",
                "title": "합성 시행일",
                "text": "[합성] 이 자료는 2024년 1월 1일부터 적용한다.",
                "effective_from": "2024-01-01",
                "effective_to": None,
                "applies_to": ["local_general_service"],
                "topic_tags": ["medical_leave", "supplementary"],
                "relation_ids": [],
            },
        ]
    }
    content = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return RawSnapshot(
        snapshot_id="SNAP-SYNTH-001",
        source_id="SYNTHETIC-SOURCE",
        official_source_id="SYNTHETIC-OFFICIAL-ID",
        source_url="https://example.invalid/synthetic-source",
        content=content,
        content_type="application/json",
        content_hash=hashlib.sha256(content.encode()).hexdigest(),
        retrieved_at=datetime(2026, 7, 29, tzinfo=UTC),
        promulgation_date=date(2023, 12, 1),
        effective_from=date(2024, 1, 1),
        parser_version="0.1.0",
    )
