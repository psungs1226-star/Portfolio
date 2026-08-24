from typing import Any

import pytest

from insaon.evaluation import (
    ShadowStudyContractError,
    validate_shadow_study_manifest,
)


def _manifest() -> dict[str, Any]:
    return {
        "schema_version": "0.1.0",
        "status": "completed",
        "protocol_version": "shadow-synthetic-v0.1.0",
        "input_policy": "public_law_and_synthetic_tasks_only",
        "actual_employee_data_allowed": False,
        "tasks": [
            {"task_id": "CASE-A", "kind": "missing_condition"},
            {"task_id": "CASE-B", "kind": "evidence_review"},
            {"task_id": "CASE-C", "kind": "out_of_scope"},
        ],
        "participants": [{"participant_id": "P-01", "role_bucket": "hr-adjacent"}],
        "sessions": [
            {
                "session_id": "SESSION-01",
                "participant_id": "P-01",
                "task_ids": ["CASE-A", "CASE-B", "CASE-C"],
                "status": "completed",
                "started_at": "2026-07-29T21:00:00+09:00",
                "ended_at": "2026-07-29T21:30:00+09:00",
                "stop_reason": None,
                "observations": {
                    "task_completed": 3,
                    "evidence_found": 3,
                    "review_reasons_understood": 3,
                },
            }
        ],
        "completed_sessions": 1,
        "stopped_sessions": 0,
        "public_aggregation_only": True,
    }


def test_shadow_study_counts_completed_sessions_without_raw_text() -> None:
    summary = validate_shadow_study_manifest(
        _manifest(),
        require_completed_sessions=True,
    )

    assert summary["completed_sessions"] == 1
    assert summary["task_count"] == 3


def test_shadow_study_rejects_raw_transcript_and_zero_completed_sessions() -> None:
    manifest = _manifest()
    manifest["sessions"] = []
    manifest["completed_sessions"] = 0
    manifest["transcript"] = "raw"

    with pytest.raises(ShadowStudyContractError):
        validate_shadow_study_manifest(
            manifest,
            require_completed_sessions=True,
        )
