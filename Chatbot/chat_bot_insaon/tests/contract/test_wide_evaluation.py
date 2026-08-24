from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from insaon.application.classification import QuestionClassifier

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "evals" / "wide-evaluation-v0.1.json"


def load_manifest() -> dict[str, Any]:
    value = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def test_wide_routing_contract_covers_each_topic_once() -> None:
    manifest = load_manifest()
    probes = manifest["routing_probes"]
    classifier = QuestionClassifier()

    assert len(manifest["topics"]) == 8
    assert {probe["topic"] for probe in probes} == set(manifest["topics"])
    for probe in probes:
        result = classifier.classify(probe["question"])
        assert result.in_scope
        assert result.intent == "evidence_lookup"
        assert result.review_tier == "evidence_only"
        assert result.topic == probe["topic"]


def test_wide_group_splits_do_not_overlap() -> None:
    manifest = load_manifest()
    splits = manifest["group_splits"]

    assert set(splits["development"]).isdisjoint(splits["locked"])
    assert splits["overlap"] == []
    assert splits["locked"] == []
    assert splits["locked_status"] == "unavailable_no_independent_legal_labels"


def test_unapproved_candidate_keeps_legal_metrics_unmeasured() -> None:
    manifest = load_manifest()
    candidate = manifest["candidate"]
    legal = manifest["legal_retrieval_results"]

    assert candidate["approval_status"] == "pending"
    assert candidate["reviewer_count"] == 0
    assert candidate["registry_source_count"] == 17
    assert candidate["parsed_source_count"] == 16
    assert legal["status"] == "unmeasured"
    assert legal["dataset_sha256"] is None
    assert all(value is None for value in legal["configurations"].values())
    assert legal["citation_accuracy"] is None
    assert legal["citation_completeness"] is None


def test_derived_allowance_smoke_records_only_measured_local_evidence() -> None:
    smoke = json.loads(
        (ROOT / "artifacts" / "provider" / "derived-allowance-smoke.json").read_text(
            encoding="utf-8"
        )
    )

    assert smoke["status"] == "passed"
    assert smoke["api_key_required"] is False
    assert smoke["external_inference_egress"] is False
    assert smoke["first_turn"]["missing_condition_count"] == 6
    assert smoke["second_turn"]["actual_service_months"] == 6
    assert smoke["second_turn"]["rate_percent"] == 100
    assert smoke["second_turn"]["official_citation_count"] == 4
    assert smoke["second_turn"]["human_approval"] == "pending"
    assert smoke["latency"]["measurement_kind"] == "single_run_not_p95"
    assert smoke["legal_accuracy_status"] == "unmeasured"
