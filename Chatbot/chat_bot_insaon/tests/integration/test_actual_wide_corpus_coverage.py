from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest

from insaon.adapters.source import CandidateEvidenceCorpus, OfficialSourceRegistry
from insaon.application.classification import QuestionClassifier
from insaon.application.factory import build_candidate_evidence_pipeline

ROOT = Path(__file__).resolve().parents[2]
PRIVATE_ROOT = ROOT.parents[1] / "private" / "legal-wide"
CANDIDATE = PRIVATE_ROOT / "processed" / "candidate.json"
REGISTRY = ROOT / "configs" / "sources" / "official-hr-wide.toml"


@pytest.mark.skipif(
    not CANDIDATE.is_file(),
    reason="private official candidate is intentionally outside the public submission",
)
def test_private_candidate_and_local_index_cover_the_public_hr_lifecycle() -> None:
    corpus = CandidateEvidenceCorpus.from_files(CANDIDATE, REGISTRY)
    registry = OfficialSourceRegistry.from_toml(REGISTRY)
    raw_manifest = json.loads(
        (PRIVATE_ROOT / "raw" / "manifest.json").read_text(encoding="utf-8")
    )
    candidate_payload = json.loads(CANDIDATE.read_text(encoding="utf-8"))
    expected_topics = {
        "appointment",
        "personnel_records",
        "performance_and_promotion",
        "service_and_leave",
        "pay_and_allowance",
        "discipline_and_appeal",
        "training",
        "retirement",
    }

    assert set(corpus.topic_source_ids) == expected_topics
    assert all(corpus.topic_source_ids[topic] for topic in expected_topics)
    assert {provision.source_id for provision in corpus.provisions} == set(
        corpus.source_names
    )
    assert {item["source_id"] for item in raw_manifest["snapshots"]} == {
        source.source_id for source in registry.sources
    }
    raw_hashes = {
        item["source_id"]: item["content_hash"] for item in raw_manifest["snapshots"]
    }
    assert {
        item["source_id"]: item["content_hash"] for item in candidate_payload["sources"]
    } == {source_id: raw_hashes[source_id] for source_id in corpus.source_names}

    deep_ids = {provision.provision_id for provision in corpus.deep_review_provisions}
    caches = list((PRIVATE_ROOT / "indexes").glob("*.json"))
    cached_document_sets = {
        frozenset(json.loads(path.read_text(encoding="utf-8"))["document_ids"])
        for path in caches
    }
    assert frozenset(deep_ids) in cached_document_sets

    deep_tags = {
        tag for provision in corpus.deep_review_provisions for tag in provision.topic_tags
    }
    assert deep_tags >= {
        "parental_leave",
        "medical_leave",
        "family_care_leave",
        "self_development_leave",
        "reinstatement",
    }

    pipeline = build_candidate_evidence_pipeline(corpus)
    classifier = QuestionClassifier()
    probes = (
        (
            "appointment",
            "2026-08-04 지방공무원 경력경쟁임용 자격 규정",
            {"DECREE-LOCAL-APPOINTMENT-OFFICIAL"},
        ),
        (
            "personnel_records",
            "2026-08-04 지방공무원 인사기록카드 보관 규정",
            {"RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL"},
        ),
        (
            "performance_and_promotion",
            "2026-08-04 지방공무원 근무성적평정 기준 규정",
            {"RULE-LOCAL-PERFORMANCE-OFFICIAL"},
        ),
        (
            "performance_and_promotion",
            "2026-08-04 지방공무원 승진후보자 명부 규정",
            {"DECREE-LOCAL-APPOINTMENT-OFFICIAL"},
        ),
        (
            "service_and_leave",
            "2026-08-04 지방공무원 연가 병가 복무 규정",
            {"DECREE-LOCAL-SERVICE-OFFICIAL"},
        ),
        (
            "service_and_leave",
            "2026-08-04 지방공무원 육아휴직 복직 기간 규정",
            {
                "LAW-LOCAL-OFFICIAL",
                "DECREE-LOCAL-APPOINTMENT-OFFICIAL",
                "RULE-LOCAL-HR-GUIDE-OFFICIAL",
            },
        ),
        (
            "pay_and_allowance",
            "2026-08-04 지방공무원 호봉 승급 봉급 규정",
            {"DECREE-LOCAL-PAY-OFFICIAL"},
        ),
        (
            "discipline_and_appeal",
            "2026-08-04 지방공무원 징계 소청 절차 규정",
            {"DECREE-LOCAL-DISCIPLINE-OFFICIAL"},
        ),
        (
            "training",
            "2026-08-04 지방공무원 교육훈련 의무복무 규정",
            {"DECREE-LOCAL-TRAINING-OFFICIAL", "LAW-LOCAL-TRAINING-OFFICIAL"},
        ),
        (
            "retirement",
            "2026-08-04 지방공무원 명예퇴직수당 지급 규정",
            {"DECREE-LOCAL-RETIREMENT-ALLOWANCE-OFFICIAL"},
        ),
    )

    provisions = {item.provision_id: item for item in corpus.provisions}
    for topic, query, expected_source_ids in probes:
        assert classifier.classify(query).topic == topic
        result = pipeline.retrieve(
            query,
            config_id="H3",
            top_k=5,
            reference_date=date(2026, 8, 4),
            subject="local_general_service",
            source_ids=corpus.topic_source_ids[topic],
            expand_context=False,
        )
        retrieved_source_ids = {
            provisions[item.provision_id].source_id for item in result.candidates
        }
        assert expected_source_ids & retrieved_source_ids, (
            topic,
            query,
            sorted(retrieved_source_ids),
        )
